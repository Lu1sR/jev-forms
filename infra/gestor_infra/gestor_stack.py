"""One Gestor instance (paperless-ngx) for one client: a disposable EC2 VM running
gestor/deploy/docker-compose.yml, with all state on a separate EBS volume.

Changing the compose files, the image, the instance type or the bootstrap replaces
the VM; the new one attaches the same data volume once the old one is gone.
"""

from __future__ import annotations

from pathlib import Path

from aws_cdk import (
    Acknowledgment,
    CfnOutput,
    Duration,
    RemovalPolicy,
    Size,
    Stack,
    Tags,
    Validations,
)
from aws_cdk import aws_backup as backup
from aws_cdk import aws_budgets as budgets
from aws_cdk import aws_cloudwatch as cw
from aws_cdk import aws_cloudwatch_actions as cw_actions
from aws_cdk import aws_ec2 as ec2
from aws_cdk import aws_ecr_assets as ecr_assets
from aws_cdk import aws_events as events
from aws_cdk import aws_iam as iam
from aws_cdk import aws_s3 as s3
from aws_cdk import aws_s3_assets as s3_assets
from aws_cdk import aws_sns as sns
from aws_cdk import aws_sns_subscriptions as subs
from constructs import Construct

from .config import ClientConfig

REPO_ROOT = Path(__file__).resolve().parents[2]
GESTOR_DIR = REPO_ROOT / "gestor"
BOOTSTRAP = Path(__file__).with_name("bootstrap.sh")
COMPOSE_VERSION = "v5.6.0"
CLIENT_TAG = "gestor:client"


# cdk-nag findings accepted on purpose for a small single-VM deployment.
_SCOPED = "Scoped as far as the API allows; see the policy statement."
ACKNOWLEDGEMENTS = {
    "vpc": [("AwsSolutions-VPC7", "Flow logs cost more than the VM; no inbound traffic to inspect.")],
    "instance": [
        ("AwsSolutions-EC28", "Basic monitoring plus CloudWatch agent metrics are enough."),
        ("AwsSolutions-EC29", "The VM is disposable by design; state lives on a retained EBS volume."),
    ],
    "bucket": [("AwsSolutions-S1", "Backup bucket written only by the instance role; access logs add cost.")],
    "role": [
        ("AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonSSMManagedInstanceCore]",
         "Standard policy for Session Manager (no SSH)."),
        ("AwsSolutions-IAM5[Action::s3:GetBucket*]", "CDK asset grant_read on the bootstrap assets bucket."),
        ("AwsSolutions-IAM5[Action::s3:GetObject*]", "CDK asset grant_read on the bootstrap assets bucket."),
        ("AwsSolutions-IAM5[Action::s3:List*]", "CDK asset grant_read on the bootstrap assets bucket."),
        ("AwsSolutions-IAM5[Resource::*]",
         "ecr:GetAuthorizationToken, ec2:DescribeVolumes and cloudwatch:PutMetricData (namespace-conditioned) "
         "have no resource-level scoping."),
        ("AwsSolutions-IAM5[Resource::<BackupBucket26B8E51C.Arn>/gestor/*]", "Backups write any key under gestor/."),
        ("AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:ec2:us-east-2:541099636566:instance/*]",
         "AttachVolume: the instance is unknown before creation; condition on the gestor:client tag."),
        ("AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:s3:::cdk-hnb659fds-assets-541099636566-us-east-2/*]",
         "CDK asset grant_read on the bootstrap assets bucket."),
        ("AwsSolutions-IAM5[Resource::arn:<AWS::Partition>:ssm:us-east-2:541099636566:parameter/gestor/{client}/*]",
         "Only this client's parameter path."),
    ],
    "backup_plan": [
        ("AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/"
         "AWSBackupServiceRolePolicyForBackup]", "AWS Backup's standard service role policy."),
    ],
}


class GestorStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, *, cfg: ClientConfig, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        Tags.of(self).add(CLIENT_TAG, cfg.client)

        # --- network: one public subnet, no NAT; the VM only makes outbound calls ----
        vpc = ec2.Vpc(
            self,
            "Vpc",
            ip_addresses=ec2.IpAddresses.cidr("10.80.0.0/24"),
            availability_zones=[cfg.az],
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(name="public", subnet_type=ec2.SubnetType.PUBLIC, cidr_mask=26)
            ],
            restrict_default_security_group=True,
        )
        sg = ec2.SecurityGroup(
            self,
            "InstanceSg",
            vpc=vpc,
            description=f"Gestor {cfg.client}: no inbound with tunnel ingress",
            allow_all_outbound=True,
        )
        if cfg.ingress == "caddy":
            for port in (80, 443):
                sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(port), f"Caddy {port}")

        # --- state: data volume and backup bucket outlive the stack ------------------
        data_volume = ec2.Volume(
            self,
            "DataVolume",
            availability_zone=cfg.az,
            size=Size.gibibytes(cfg.data_volume_gb),
            volume_type=ec2.EbsDeviceVolumeType.GP3,
            encrypted=True,
            removal_policy=RemovalPolicy.RETAIN,
        )

        backup_bucket = s3.Bucket(
            self,
            "BackupBucket",
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            versioned=True,
            removal_policy=RemovalPolicy.RETAIN,
            lifecycle_rules=[
                s3.LifecycleRule(
                    noncurrent_version_expiration=Duration.days(cfg.s3_noncurrent_days),
                    abort_incomplete_multipart_upload_after=Duration.days(7),
                ),
                # Daily dumps: keep 60 days of them.
                s3.LifecycleRule(prefix="gestor/db/", expiration=Duration.days(60)),
            ],
        )

        # --- artifacts: image (arm64) and compose files -------------------------------
        image = ecr_assets.DockerImageAsset(
            self,
            "GestorImage",
            directory=str(GESTOR_DIR),
            platform=ecr_assets.Platform.LINUX_ARM64,
            exclude=["deploy", "docs", "README.md"],
        )
        deploy_files = s3_assets.Asset(
            self,
            "DeployFiles",
            path=str(GESTOR_DIR / "deploy"),
            exclude=["data", ".env", ".gitignore", "README.md"],
        )

        # --- instance role: least privilege, no static keys on the VM ------------------
        role = iam.Role(
            self,
            "InstanceRole",
            assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"),
            managed_policies=[iam.ManagedPolicy.from_aws_managed_policy_name("AmazonSSMManagedInstanceCore")],
        )
        image.repository.grant_pull(role)
        deploy_files.grant_read(role)
        role.add_to_policy(
            iam.PolicyStatement(
                sid="ReadClientSecrets",
                actions=["ssm:GetParametersByPath", "ssm:GetParameters", "ssm:GetParameter"],
                resources=[
                    self.format_arn(service="ssm", resource="parameter", resource_name=cfg.param_path.lstrip("/")),
                    self.format_arn(
                        service="ssm", resource="parameter", resource_name=f"{cfg.param_path.lstrip('/')}/*"
                    ),
                ],
            )
        )
        # Backups: write and list, but never delete object versions, so a compromised
        # VM cannot erase the history kept by bucket versioning.
        role.add_to_policy(
            iam.PolicyStatement(
                sid="BackupWrite",
                actions=["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
                resources=[backup_bucket.arn_for_objects("gestor/*")],
            )
        )
        role.add_to_policy(
            iam.PolicyStatement(
                sid="BackupList",
                actions=["s3:ListBucket"],
                resources=[backup_bucket.bucket_arn],
                conditions={"StringLike": {"s3:prefix": ["gestor/*"]}},
            )
        )
        role.add_to_policy(
            iam.PolicyStatement(
                sid="AttachOwnDataVolume",
                actions=["ec2:AttachVolume"],
                resources=[
                    self.format_arn(service="ec2", resource="volume", resource_name=data_volume.volume_id),
                    self.format_arn(service="ec2", resource="instance", resource_name="*"),
                ],
                conditions={"StringEquals": {f"aws:ResourceTag/{CLIENT_TAG}": cfg.client}},
            )
        )
        role.add_to_policy(iam.PolicyStatement(sid="DescribeVolumes", actions=["ec2:DescribeVolumes"], resources=["*"]))
        role.add_to_policy(
            iam.PolicyStatement(
                sid="CloudWatchAgentMetrics",
                actions=["cloudwatch:PutMetricData"],
                resources=["*"],
                conditions={"StringEquals": {"cloudwatch:namespace": "Gestor"}},
            )
        )

        # --- instance ------------------------------------------------------------------
        instance_env = {
            "DATA_ROOT": "/data",
            "GESTOR_IMAGE": image.image_uri,
            "PAPERLESS_URL": f"https://{cfg.domain}",
            "GESTOR_DOMAIN": cfg.domain,
            "GESTOR_APP_TITLE": cfg.app_title,
            "PAPERLESS_ADMIN_USER": cfg.admin_user,
            "GESTOR_OCR_LANGUAGE": cfg.ocr_language,
            "GESTOR_DATE_ORDER": cfg.date_order,
            "GESTOR_DATE_PARSER_LANGUAGES": cfg.date_parser_languages,
            "GESTOR_SEARCH_LANGUAGE": cfg.search_language,
            "GESTOR_TIME_ZONE": cfg.time_zone,
            "SMTP_HOST": cfg.smtp_host,
            "SMTP_PORT": str(cfg.smtp_port),
            "SMTP_USE_TLS": "true",
            "SMTP_USER": cfg.smtp_user,
            "SMTP_FROM": f'"{cfg.smtp_from}"',
            "BACKUP_S3_URI": f"s3://{backup_bucket.bucket_name}/gestor",
            "BACKUP_LOCAL_DAYS": "3",
        }
        script = BOOTSTRAP.read_text()
        for key, value in {
            "REGION": self.region,
            "CLIENT": cfg.client,
            "PARAM_PATH": cfg.param_path,
            "VOLUME_ID": data_volume.volume_id,
            "DEPLOY_ZIP": deploy_files.s3_object_url,
            "IMAGE_URI": image.image_uri,
            "SWAP_GB": str(cfg.swap_gb),
            "PROFILE": cfg.ingress,
            "COMPOSE_VERSION": COMPOSE_VERSION,
            "BACKUP_TIME": cfg.backup_time,
            "TIME_ZONE": cfg.time_zone,
            "INSTANCE_ENV": "\n".join(f"{k}={v}" for k, v in instance_env.items()),
        }.items():
            script = script.replace(f"@@{key}@@", value)

        user_data = ec2.UserData.custom(script)
        instance = ec2.Instance(
            self,
            "Instance",
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(subnet_type=ec2.SubnetType.PUBLIC),
            availability_zone=cfg.az,
            instance_type=ec2.InstanceType(cfg.instance_type),
            machine_image=ec2.MachineImage.latest_amazon_linux2023(cpu_type=ec2.AmazonLinuxCpuType.ARM_64),
            security_group=sg,
            role=role,
            user_data=user_data,
            user_data_causes_replacement=True,
            associate_public_ip_address=True,
            block_devices=[
                ec2.BlockDevice(
                    device_name="/dev/xvda",
                    volume=ec2.BlockDeviceVolume.ebs(
                        cfg.root_volume_gb,
                        volume_type=ec2.EbsDeviceVolumeType.GP3,
                        encrypted=True,
                        delete_on_termination=True,
                    ),
                )
            ],
        )
        # IMDSv2 only, and hop limit 1 so containers cannot reach the metadata endpoint
        # (instance credentials). Set here rather than with require_imdsv2, whose launch
        # template has a fixed name that would clash between client stacks.
        instance.instance.add_property_override(
            "MetadataOptions",
            {"HttpTokens": "required", "HttpEndpoint": "enabled", "HttpPutResponseHopLimit": 1},
        )

        if cfg.ingress == "caddy":
            ec2.CfnEIP(self, "PublicIp", instance_id=instance.instance_id)

        # --- AWS Backup: daily snapshot of the data volume ----------------------------
        vault = backup.BackupVault(self, "Vault", removal_policy=RemovalPolicy.RETAIN)
        hour, minute = cfg.backup_time.split(":")
        plan = backup.BackupPlan(self, "BackupPlan", backup_vault=vault)
        plan.add_rule(
            backup.BackupPlanRule(
                rule_name="daily",
                # Cron is UTC; Ecuador is UTC-5 with no daylight saving.
                schedule_expression=events.Schedule.cron(hour=str((int(hour) + 5) % 24), minute=minute),
                delete_after=Duration.days(cfg.snapshot_retention_days),
            )
        )
        plan.add_selection(
            "DataVolume",
            resources=[
                backup.BackupResource.from_arn(
                    self.format_arn(service="ec2", resource="volume", resource_name=data_volume.volume_id)
                )
            ],
        )

        # --- alarms and budget ---------------------------------------------------------
        topic = sns.Topic(self, "Alerts", enforce_ssl=True)
        if cfg.alert_email:
            topic.add_subscription(subs.EmailSubscription(cfg.alert_email))
        notify = cw_actions.SnsAction(topic)

        def alarm(name: str, metric: cw.IMetric, threshold: float, periods: int = 3) -> cw.Alarm:
            a = cw.Alarm(
                self,
                name,
                metric=metric,
                threshold=threshold,
                evaluation_periods=periods,
                comparison_operator=cw.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                treat_missing_data=cw.TreatMissingData.BREACHING,
            )
            a.add_alarm_action(notify)
            return a

        iid = {"InstanceId": instance.instance_id}
        system_check = alarm(
            "SystemCheckFailed",
            cw.Metric(namespace="AWS/EC2", metric_name="StatusCheckFailed_System", dimensions_map=iid,
                      period=Duration.minutes(1), statistic="Maximum"),
            1,
            periods=2,
        )
        # Hardware failure: move the VM to a healthy host, same volumes.
        system_check.add_alarm_action(cw_actions.Ec2Action(cw_actions.Ec2InstanceAction.RECOVER))
        alarm("InstanceCheckFailed",
              cw.Metric(namespace="AWS/EC2", metric_name="StatusCheckFailed_Instance", dimensions_map=iid,
                        period=Duration.minutes(1), statistic="Maximum"), 1, periods=5)
        alarm("MemoryHigh",
              cw.Metric(namespace="Gestor", metric_name="mem_used_percent", dimensions_map=iid,
                        period=Duration.minutes(5)), 90)
        alarm("SwapHigh",
              cw.Metric(namespace="Gestor", metric_name="swap_used_percent", dimensions_map=iid,
                        period=Duration.minutes(5)), 50)
        for path, threshold in (("/", 85), ("/data", 80)):
            alarm(f"DiskHigh{path.strip('/').capitalize() or 'Root'}",
                  cw.Metric(namespace="Gestor", metric_name="disk_used_percent",
                            dimensions_map={**iid, "path": path}, period=Duration.minutes(5)), threshold)

        if cfg.alert_email:
            budgets.CfnBudget(
                self,
                "MonthlyBudget",
                budget=budgets.CfnBudget.BudgetDataProperty(
                    budget_name=f"gestor-{cfg.client}",
                    budget_type="COST",
                    time_unit="MONTHLY",
                    budget_limit=budgets.CfnBudget.SpendProperty(amount=cfg.monthly_budget_usd, unit="USD"),
                ),
                notifications_with_subscribers=[
                    budgets.CfnBudget.NotificationWithSubscribersProperty(
                        notification=budgets.CfnBudget.NotificationProperty(
                            comparison_operator="GREATER_THAN",
                            notification_type=kind,
                            threshold=pct,
                            threshold_type="PERCENTAGE",
                        ),
                        subscribers=[budgets.CfnBudget.SubscriberProperty(
                            subscription_type="EMAIL", address=cfg.alert_email)],
                    )
                    for kind, pct in (("ACTUAL", 50), ("ACTUAL", 80), ("ACTUAL", 100), ("FORECASTED", 100))
                ],
            )

        # --- outputs -----------------------------------------------------------------------
        CfnOutput(self, "InstanceId", value=instance.instance_id)
        CfnOutput(self, "DataVolumeId", value=data_volume.volume_id)
        CfnOutput(self, "BackupBucketName", value=backup_bucket.bucket_name)
        CfnOutput(self, "SecretsPath", value=cfg.param_path)
        CfnOutput(self, "Shell", value=f"aws ssm start-session --target {instance.instance_id}")
        CfnOutput(self, "PublicUrl", value=f"https://{cfg.domain}")

        self._acknowledge(cfg, vpc=vpc, role=role, instance=instance, bucket=backup_bucket, backup_plan=plan)

    def _acknowledge(self, cfg: ClientConfig, **constructs: Construct) -> None:
        for name, construct in constructs.items():
            for rule_id, reason in ACKNOWLEDGEMENTS[name]:
                Validations.of(construct).acknowledge(
                    Acknowledgment(id=rule_id.format(client=cfg.client), reason=reason)
                )
