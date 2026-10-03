"""Per-client settings, read from clients/<client>.yaml."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import yaml

CLIENTS_DIR = Path(__file__).resolve().parent.parent / "clients"


@dataclass(frozen=True)
class ClientConfig:
    client: str
    az: str
    instance_type: str
    root_volume_gb: int
    data_volume_gb: int
    swap_gb: int
    domain: str
    ingress: str
    app_title: str
    admin_user: str
    ocr_language: str
    date_order: str
    date_parser_languages: str
    search_language: str
    time_zone: str
    smtp_host: str
    smtp_port: int
    smtp_user: str
    smtp_from: str
    backup_time: str
    snapshot_retention_days: int
    s3_noncurrent_days: int
    alert_email: str
    monthly_budget_usd: int

    @property
    def param_path(self) -> str:
        """SSM Parameter Store prefix holding this client's secrets."""
        return f"/gestor/{self.client}"

    @classmethod
    def load(cls, client: str) -> ClientConfig:
        if not re.fullmatch(r"[a-z0-9-]{2,30}", client):
            raise ValueError(f"client must be lowercase letters, digits or '-': {client!r}")
        path = CLIENTS_DIR / f"{client}.yaml"
        if not path.exists():
            raise FileNotFoundError(f"no client file {path}")
        raw = yaml.safe_load(path.read_text())
        if raw.get("client") != client:
            raise ValueError(f"{path.name}: 'client' must be {client!r}")

        inst, ges, smtp = raw["instance"], raw["gestor"], raw.get("smtp") or {}
        backup, alerts = raw.get("backup") or {}, raw.get("alerts") or {}
        cfg = cls(
            client=client,
            az=raw["az"],
            instance_type=inst["type"],
            root_volume_gb=int(inst.get("root_volume_gb", 16)),
            data_volume_gb=int(inst.get("data_volume_gb", 20)),
            swap_gb=int(inst.get("swap_gb", 4)),
            domain=ges["domain"],
            ingress=ges.get("ingress", "tunnel"),
            app_title=ges.get("app_title", "Gestor"),
            admin_user=ges.get("admin_user", "admin"),
            ocr_language=ges.get("ocr_language", "spa+eng"),
            date_order=ges.get("date_order", "DMY"),
            date_parser_languages=ges.get("date_parser_languages", "es+en"),
            search_language=ges.get("search_language", "es"),
            time_zone=ges.get("time_zone", "America/Guayaquil"),
            smtp_host=smtp.get("host", ""),
            smtp_port=int(smtp.get("port", 587)),
            smtp_user=smtp.get("user", ""),
            smtp_from=smtp.get("from", ""),
            backup_time=str(backup.get("time", "03:00")),
            snapshot_retention_days=int(backup.get("snapshot_retention_days", 7)),
            s3_noncurrent_days=int(backup.get("s3_noncurrent_days", 30)),
            alert_email=alerts.get("email", "") or "",
            monthly_budget_usd=int(alerts.get("monthly_budget_usd", 25)),
        )
        if cfg.ingress not in ("tunnel", "caddy"):
            raise ValueError("gestor.ingress must be 'tunnel' or 'caddy'")
        if not cfg.instance_type.startswith(("t4g.", "m7g.", "c7g.", "r7g.", "m8g.", "c8g.")):
            raise ValueError("instance.type must be ARM (Graviton): the image is built for arm64")
        if not re.fullmatch(r"\d{2}:\d{2}", cfg.backup_time):
            raise ValueError("backup.time must be HH:MM")
        return cfg
