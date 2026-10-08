#!/bin/bash
# First boot of a Gestor VM (Amazon Linux 2023, arm64). Rendered by gestor_stack.py:
# @@NAME@@ placeholders are replaced at synth time. Output: /var/log/gestor-bootstrap.log
#
# The VM is disposable: all state is on the data EBS volume, which this script attaches
# (waiting for a previous VM to release it), mounts on /data and formats only if empty.
set -euo pipefail
exec > >(tee -a /var/log/gestor-bootstrap.log) 2>&1
echo "[gestor] bootstrap start $(date -Is)"

REGION="@@REGION@@"
VOLUME_ID="@@VOLUME_ID@@"
DEPLOY_ZIP="@@DEPLOY_ZIP@@"
IMAGE_URI="@@IMAGE_URI@@"
SWAP_GB="@@SWAP_GB@@"
PROFILES="@@PROFILES@@"
COMPOSE_VERSION="@@COMPOSE_VERSION@@"
export AWS_DEFAULT_REGION="${REGION}"

# --- packages ---------------------------------------------------------------
dnf install -y docker unzip amazon-cloudwatch-agent
systemctl enable --now docker

plugins=/usr/local/lib/docker/cli-plugins
mkdir -p "${plugins}"
base="https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}"
curl -fsSL -o "${plugins}/docker-compose" "${base}/docker-compose-linux-aarch64"
expected="$(curl -fsSL "${base}/docker-compose-linux-aarch64.sha256" | awk '{print $1}')"
echo "${expected}  ${plugins}/docker-compose" | sha256sum -c -
chmod 755 "${plugins}/docker-compose"

# --- swap -------------------------------------------------------------------
if [[ ! -f /swapfile ]]; then
	fallocate -l "${SWAP_GB}G" /swapfile
	chmod 600 /swapfile
	mkswap /swapfile
	echo "/swapfile none swap sw 0 0" >>/etc/fstab
fi
swapon -a
echo "vm.swappiness=10" >/etc/sysctl.d/90-gestor.conf
sysctl --system >/dev/null

# --- data volume --------------------------------------------------------------
token="$(curl -fsS -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 300')"
INSTANCE_ID="$(curl -fsS -H "X-aws-ec2-metadata-token: ${token}" http://169.254.169.254/latest/meta-data/instance-id)"
device="/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${VOLUME_ID//-/}"

# On a replacement the old VM still holds the volume until CloudFormation terminates it.
for attempt in $(seq 1 120); do
	[[ -e "${device}" ]] && break
	state="$(aws ec2 describe-volumes --volume-ids "${VOLUME_ID}" --query 'Volumes[0].State' --output text)"
	if [[ "${state}" == "available" ]]; then
		aws ec2 attach-volume --volume-id "${VOLUME_ID}" --instance-id "${INSTANCE_ID}" --device /dev/sdf || true
	else
		echo "[gestor] volume ${VOLUME_ID} is ${state}, waiting (${attempt})"
	fi
	sleep 15
done
[[ -e "${device}" ]] || { echo "[gestor] data volume never attached"; exit 1; }

if ! blkid "${device}" >/dev/null 2>&1; then
	echo "[gestor] empty data volume, formatting"
	mkfs.xfs -L gestor-data "${device}"
fi
mkdir -p /data
uuid="$(blkid -s UUID -o value "${device}")"
grep -q "${uuid}" /etc/fstab || echo "UUID=${uuid} /data xfs defaults,nofail 0 2" >>/etc/fstab
mount -a
mkdir -p /data/paperless/{data,media,consume,export} /data/postgres /data/redis /data/backups /data/n8n

# --- compose files and settings ------------------------------------------------
app=/opt/gestor
rm -rf "${app}" && mkdir -p "${app}"
aws s3 cp --only-show-errors "${DEPLOY_ZIP}" /tmp/gestor-deploy.zip
unzip -q /tmp/gestor-deploy.zip -d "${app}"
rm /tmp/gestor-deploy.zip
chmod 755 "${app}/backup.sh" "${app}/flows/import.sh"

cat >"${app}/instance.env" <<'ENV'
@@INSTANCE_ENV@@
ENV

cat >/usr/local/bin/gestor-render-env <<'SH'
#!/bin/bash
# Builds /opt/gestor/.env from instance.env plus the client's SSM SecureString parameters.
# GOOGLE_SA_JSON (the service-account key, one line) goes to a file instead, referenced
# as GOOGLE_SA_FILE, because .env cannot hold JSON.
set -euo pipefail
cd /opt/gestor
umask 077
rm -f google-sa.json
{
	cat instance.env
	aws ssm get-parameters-by-path --path "@@PARAM_PATH@@" --with-decryption \
		--region "@@REGION@@" --query 'Parameters[].[Name,Value]' --output text |
		while IFS=$'\t' read -r name value; do
			key="${name##*/}"
			if [[ "$key" == "GOOGLE_SA_JSON" ]]; then
				printf '%s\n' "$value" >google-sa.json
				echo "GOOGLE_SA_FILE=/opt/gestor/google-sa.json"
			else
				echo "${key}=${value}"
			fi
		done
} >.env.new
mv .env.new .env
SH
chmod 755 /usr/local/bin/gestor-render-env

cat >/usr/local/bin/gestor-up <<SH
#!/bin/bash
# Renders .env, logs in to ECR and starts the stack. Runs on every boot.
set -euo pipefail
export COMPOSE_PROFILES="${PROFILES}"
/usr/local/bin/gestor-render-env
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${IMAGE_URI%%/*}"
cd /opt/gestor
docker compose pull --quiet
docker compose up -d --remove-orphans
# Old image versions left by updates fill the 16 GB root disk; keep only those in use.
docker image prune -af
# Flows: load credentials and workflows into n8n once the Paperless service token exists
# (created by flows/paperless_setup.py and stored in SSM; see flows/README.md).
if [[ ",\${COMPOSE_PROFILES}," == *,flows,* ]]; then
	if grep -q '^PAPERLESS_FLOWS_TOKEN=.' .env; then
		./flows/import.sh || echo "[gestor] flows import failed; run /opt/gestor/flows/import.sh by hand"
	else
		echo "[gestor] flows: PAPERLESS_FLOWS_TOKEN not set yet; run flows/paperless_setup.py, store the token in SSM, then gestor-up"
	fi
fi
SH
chmod 755 /usr/local/bin/gestor-up

# --- systemd: start on boot, stop cleanly, daily backup ---------------------------
cat >/etc/systemd/system/gestor.service <<UNIT
[Unit]
Description=Gestor (docker compose)
Requires=docker.service
After=docker.service network-online.target data.mount
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/local/bin/gestor-up
Environment=COMPOSE_PROFILES=${PROFILES}
ExecStop=/usr/bin/docker compose --project-directory /opt/gestor down
TimeoutStartSec=900
TimeoutStopSec=120

[Install]
WantedBy=multi-user.target
UNIT

cat >/etc/systemd/system/gestor-backup.service <<'UNIT'
[Unit]
Description=Gestor backup (pg_dump + document_exporter -> S3)
Requires=gestor.service
After=gestor.service

[Service]
Type=oneshot
ExecStart=/opt/gestor/backup.sh
UNIT

cat >/etc/systemd/system/gestor-backup.timer <<'UNIT'
[Unit]
Description=Daily Gestor backup

[Timer]
OnCalendar=*-*-* @@BACKUP_TIME@@:00 @@TIME_ZONE@@
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
UNIT

# --- CloudWatch agent: memory, swap and disk ------------------------------------------
cat >/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'JSON'
{
  "agent": {"metrics_collection_interval": 60},
  "metrics": {
    "namespace": "Gestor",
    "append_dimensions": {"InstanceId": "${aws:InstanceId}"},
    "aggregation_dimensions": [["InstanceId"], ["InstanceId", "path"]],
    "metrics_collected": {
      "mem": {"measurement": ["mem_used_percent"]},
      "swap": {"measurement": ["swap_used_percent"]},
      "disk": {"measurement": ["used_percent"], "resources": ["/", "/data"], "drop_device": true}
    }
  }
}
JSON
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 \
	-c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json -s

systemctl daemon-reload
systemctl enable gestor.service gestor-backup.timer
systemctl start gestor.service
systemctl start gestor-backup.timer
echo "[gestor] bootstrap done $(date -Is)"
