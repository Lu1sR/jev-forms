#!/usr/bin/env python3
"""CDK app: one Gestor stack per client.

    npx aws-cdk@2 synth  -c client=familia
    npx aws-cdk@2 deploy -c client=familia
"""

import aws_cdk as cdk
from cdk_nag import AwsSolutionsChecks

from gestor_infra.config import ClientConfig
from gestor_infra.gestor_stack import GestorStack

ACCOUNT = "541099636566"
REGION = "us-east-2"  # the project's only Region

app = cdk.App()
client = app.node.try_get_context("client")
if not client:
    raise SystemExit("pass the client: -c client=<name> (see clients/)")
cfg = ClientConfig.load(client)

GestorStack(
    app,
    f"Gestor-{cfg.client}",
    cfg=cfg,
    env=cdk.Environment(account=ACCOUNT, region=REGION),
    description=f"Gestor (paperless-ngx) for {cfg.client}",
    termination_protection=True,
)
cdk.Validations.of(app).add_plugins(AwsSolutionsChecks(app))
app.synth()
