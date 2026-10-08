#!/usr/bin/env python3
"""Prepare a Paperless instance for one flow: tags, custom fields, saved views, the
service user n8n authenticates as, and the native workflow that calls n8n.

    python3 paperless_setup.py --url http://localhost:8000 --user admin sheets
    PAPERLESS_PASSWORD=... FLOWS_WEBHOOK_SECRET=... python3 paperless_setup.py ...

Reads paperless/<flow>.yaml. Idempotent: objects are matched by name and updated, so it
can be re-run after editing the YAML or on a restored instance. Only the standard
library is needed (the EC2 VM has no pip packages). The service user's API token is
printed once, the first time the user is created; later runs keep the existing token.
"""
from __future__ import annotations

import argparse
import getpass
import json
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent

TRIGGER_TYPES = {"consumption": 1, "document_added": 2, "document_updated": 3, "scheduled": 4}
ACTION_TYPES = {"assignment": 1, "removal": 2, "email": 3, "webhook": 4}
MATCH_NONE = 0


class Api:
    def __init__(self, url: str, auth_header: str) -> None:
        self.base = url.rstrip("/")
        self.auth = auth_header

    def call(self, method: str, path: str, data: dict | None = None, **query) -> dict | list | None:
        url = f"{self.base}{path}"
        if query:
            url += ("&" if "?" in url else "?") + urllib.parse.urlencode(query)
        body = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("Authorization", self.auth)
        req.add_header("Accept", "application/json; version=10")
        if body is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read()
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:500]
            sys.exit(f"{method} {path} -> HTTP {e.code}: {detail}")
        return json.loads(raw) if raw else None

    def all(self, path: str, **query) -> list[dict]:
        out: list[dict] = []
        page = self.call("GET", path, page_size=100, **query)
        while True:
            out.extend(page["results"])
            if not page.get("next"):
                return out
            page = self.call("GET", page["next"][len(self.base):])

    def by_name(self, path: str, name: str) -> dict | None:
        for obj in self.all(path, name__iexact=name):
            if obj["name"].lower() == name.lower():
                return obj
        return None

    def upsert(self, path: str, name: str, payload: dict, label: str) -> dict:
        existing = self.by_name(path, name)
        if existing:
            obj = self.call("PATCH", f"{path}{existing['id']}/", payload)
            print(f"  updated {label} {name!r} (id {obj['id']})")
        else:
            obj = self.call("POST", path, {"name": name, **payload})
            print(f"  created {label} {name!r} (id {obj['id']})")
        return obj


def load_yaml(path: Path) -> dict:
    try:
        import yaml  # type: ignore
    except ImportError:
        return _mini_yaml(path.read_text(encoding="utf-8"))
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def _mini_yaml(text: str) -> dict:
    """Enough YAML for paperless/*.yaml without PyYAML: mappings, lists, flow dicts/lists,
    scalars, comments. Keeps the VM free of pip packages."""
    import re

    def scalar(v: str):
        v = v.strip()
        if v.startswith(("'", '"')) and v.endswith(v[0]):
            return v[1:-1]
        if v.startswith("{"):
            return dict((k.strip(), scalar(x)) for k, x in (p.split(":", 1) for p in _split(v[1:-1])))
        if v.startswith("["):
            return [scalar(x) for x in _split(v[1:-1]) if x.strip()]
        if v in ("true", "false"):
            return v == "true"
        if re.fullmatch(r"-?\d+", v):
            return int(v)
        return v

    def _split(s: str) -> list[str]:
        parts, depth, cur = [], 0, ""
        for ch in s:
            if ch in "[{":
                depth += 1
            elif ch in "]}":
                depth -= 1
            if ch == "," and depth == 0:
                parts.append(cur); cur = ""
            else:
                cur += ch
        if cur.strip():
            parts.append(cur)
        return parts

    lines = []
    for raw in text.splitlines():
        line = re.sub(r"(^|\s)#.*$", "", raw).rstrip()
        if line.strip():
            lines.append((len(line) - len(line.lstrip()), line.strip()))

    def parse(i: int, indent: int):
        if i < len(lines) and lines[i][1].startswith("- "):
            items = []
            while i < len(lines) and lines[i][0] == indent and lines[i][1].startswith("- "):
                body = lines[i][1][2:]
                if ":" in body and not body.startswith(("{", "[", "'", '"')):
                    k, v = body.split(":", 1)
                    item = {k.strip(): scalar(v)} if v.strip() else {}
                    if not v.strip():
                        sub, i = parse(i + 1, lines[i + 1][0]) if i + 1 < len(lines) and lines[i + 1][0] > indent else ({}, i + 1)
                        item[k.strip()] = sub
                        items.append(item); continue
                    i += 1
                    while i < len(lines) and lines[i][0] > indent:
                        k2, v2 = lines[i][1].split(":", 1)
                        if v2.strip():
                            item[k2.strip()] = scalar(v2); i += 1
                        else:
                            item[k2.strip()], i = parse(i + 1, lines[i + 1][0])
                    items.append(item)
                else:
                    items.append(scalar(body)); i += 1
            return items, i
        out = {}
        while i < len(lines) and lines[i][0] == indent:
            k, v = lines[i][1].split(":", 1)
            if v.strip():
                out[k.strip()] = scalar(v); i += 1
            elif i + 1 < len(lines) and lines[i + 1][0] >= indent:
                out[k.strip()], i = parse(i + 1, lines[i + 1][0])
            else:
                out[k.strip()] = None; i += 1
        return out, i

    return parse(0, 0)[0]


def tag_ids(api: Api, names: list[str], cache: dict[str, int]) -> list[int]:
    ids = []
    for n in names or []:
        if n not in cache:
            t = api.by_name("/api/tags/", n) or sys.exit(f"tag {n!r} not found")
            cache[n] = t["id"]
        ids.append(cache[n])
    return ids


def apply(api: Api, spec: dict, webhook_secret: str | None) -> None:
    tags: dict[str, int] = {}
    print("tags")
    for t in spec.get("tags", []):
        # No owner: objects created through the API belong to the caller and are invisible
        # to everyone else (the service user included). Ownerless = visible to all users.
        obj = api.upsert("/api/tags/", t["name"], {"color": t.get("color", "#a6cee3"),
                                                   "matching_algorithm": MATCH_NONE, "owner": None}, "tag")
        tags[t["name"]] = obj["id"]

    print("custom fields")
    fields: dict[str, int] = {}
    for f in spec.get("custom_fields", []):
        existing = api.by_name("/api/custom_fields/", f["name"])
        if existing and existing["data_type"] != f["data_type"]:
            sys.exit(f"custom field {f['name']!r} exists with type {existing['data_type']}; "
                     "Paperless cannot change a field's type, rename one of them")
        extra = {}
        if f["data_type"] == "monetary" and f.get("default_currency"):
            extra["default_currency"] = f["default_currency"]
        if f["data_type"] == "select":
            extra["select_options"] = [{"label": o, "id": None} for o in f["options"]]
        payload = {"data_type": f["data_type"], "extra_data": extra}
        if existing:
            obj = api.call("PATCH", f"/api/custom_fields/{existing['id']}/", {"extra_data": extra})
            print(f"  kept custom field {f['name']!r} (id {obj['id']})")
        else:
            obj = api.call("POST", "/api/custom_fields/", {"name": f["name"], **payload})
            print(f"  created custom field {f['name']!r} (id {obj['id']})")
        fields[f["name"]] = obj["id"]

    user_id = None
    su = spec.get("service_user")
    if su:
        print("service user")
        existing = [u for u in api.all("/api/users/") if u["username"] == su["username"]]
        payload = {"user_permissions": [p.split(".", 1)[1] for p in su.get("permissions", [])],
                   "is_active": True, "is_staff": False, "is_superuser": False}
        if existing:
            user = api.call("PATCH", f"/api/users/{existing[0]['id']}/", payload)
            print(f"  kept user {su['username']!r} (id {user['id']}); token unchanged")
        else:
            password = secrets.token_urlsafe(32)
            user = api.call("POST", "/api/users/", {"username": su["username"], "password": password,
                                                    "email": "", **payload})
            token = _token(api.base, su["username"], password)
            print(f"  created user {su['username']!r} (id {user['id']})")
            print(f"\n  PAPERLESS_FLOWS_TOKEN={token}\n  (shown once; the password is random and discarded)\n")
        user_id = user["id"]

    print("saved views")
    for v in spec.get("saved_views", []):
        rules = [{"rule_type": 6, "value": str(i)} for i in tag_ids(api, v.get("tags_all"), tags)]
        payload = {"show_on_dashboard": bool(v.get("show_on_dashboard")),
                   "show_in_sidebar": bool(v.get("show_in_sidebar", True)),
                   "sort_field": "created", "sort_reverse": True, "filter_rules": rules,
                   "owner": None}  # shared with every user of the instance
        api.upsert("/api/saved_views/", v["name"], payload, "saved view")

    wf = spec.get("workflow")
    if wf:
        print("workflow")
        triggers = []
        for t in wf["triggers"]:
            triggers.append({
                "type": TRIGGER_TYPES[t["type"]],
                "sources": [1, 2, 3, 4],
                "filter_has_tags": tag_ids(api, t.get("has_tags"), tags),
                "filter_has_all_tags": tag_ids(api, t.get("has_all_tags"), tags),
                "filter_has_not_tags": tag_ids(api, t.get("has_not_tags"), tags),
                "matching_algorithm": MATCH_NONE, "match": "", "is_insensitive": True,
            })
        actions = []
        for i, a in enumerate(wf["actions"]):
            if a["type"] == "assignment":
                users = []
                for name in a.get("change_users", []):
                    if su and name == su["username"]:
                        users.append(user_id)
                    else:
                        users.append(next(u["id"] for u in api.all("/api/users/") if u["username"] == name))
                actions.append({"type": ACTION_TYPES["assignment"], "order": i,
                                "assign_change_users": users,
                                "assign_tags": tag_ids(api, a.get("tags"), tags)})
            elif a["type"] == "webhook":
                headers = {}
                if a.get("secret_header"):
                    if not webhook_secret:
                        sys.exit("the workflow sends a secret header: set FLOWS_WEBHOOK_SECRET")
                    headers[a["secret_header"]] = webhook_secret
                # Key/value params + JSON: Paperless then posts a real JSON object. With a
                # text body and as_json it would post a JSON *string* instead.
                actions.append({"type": ACTION_TYPES["webhook"], "order": i, "webhook": {
                    "url": a["url"], "use_params": True, "as_json": True, "params": a["params"],
                    "body": "", "headers": headers, "include_document": False}})
            else:
                sys.exit(f"unsupported action type {a['type']!r}")
        payload = {"order": 0, "enabled": True, "triggers": triggers, "actions": actions}
        existing = api.by_name("/api/workflows/", wf["name"])
        if existing:
            obj = api.call("PUT", f"/api/workflows/{existing['id']}/", {"name": wf["name"], **payload})
            print(f"  updated workflow {wf['name']!r} (id {obj['id']})")
        else:
            obj = api.call("POST", "/api/workflows/", {"name": wf["name"], **payload})
            print(f"  created workflow {wf['name']!r} (id {obj['id']})")


def _token(base: str, username: str, password: str) -> str:
    body = urllib.parse.urlencode({"username": username, "password": password}).encode()
    req = urllib.request.Request(f"{base}/api/token/", data=body, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["token"]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("flow", help="name of paperless/<flow>.yaml")
    ap.add_argument("--url", default=os.getenv("PAPERLESS_URL", "http://localhost:8000"))
    ap.add_argument("--user", default=os.getenv("PAPERLESS_ADMIN_USER", "admin"),
                    help="admin user (password from PAPERLESS_PASSWORD or prompted)")
    ap.add_argument("--token", default=os.getenv("PAPERLESS_ADMIN_TOKEN"), help="admin API token instead of a password")
    args = ap.parse_args()

    spec_path = HERE / "paperless" / f"{args.flow}.yaml"
    if not spec_path.exists():
        sys.exit(f"no such flow: {spec_path}")
    spec = load_yaml(spec_path)

    if args.token:
        auth = f"Token {args.token}"
    else:
        password = os.getenv("PAPERLESS_PASSWORD") or getpass.getpass(f"password for {args.user}: ")
        auth = "Token " + _token(args.url, args.user, password)
    api = Api(args.url, auth)
    print(f"flow {args.flow!r} on {args.url}")
    apply(api, spec, os.getenv("FLOWS_WEBHOOK_SECRET"))
    print("done")


if __name__ == "__main__":
    main()
