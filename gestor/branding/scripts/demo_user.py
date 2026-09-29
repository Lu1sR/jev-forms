# Creates the "Demo" group and the demo user from GESTOR_DEMO_USER / GESTOR_DEMO_PASSWORD.
# Idempotent: the group's permissions are reset on every boot, the password is only set when
# the user is first created (so a password changed in the UI survives restarts).
import os

from django.contrib.auth.models import Group
from django.contrib.auth.models import Permission
from django.contrib.auth.models import User

username = os.environ["GESTOR_DEMO_USER"]
password = os.environ["GESTOR_DEMO_PASSWORD"]

# Everyday document work, no deletes: prospects can browse, upload, classify, search and
# share, but not remove demo data, touch workflows, mail, users or app configuration.
EDITABLE = [
    "document", "tag", "correspondent", "documenttype", "storagepath", "customfield",
    "customfieldinstance", "savedview", "savedviewfilterrule", "note", "sharelink",
    "sharelinkbundle", "uisettings",
]
codenames = [f"{action}_{model}" for model in EDITABLE for action in ("view", "add", "change")]
codenames += ["view_paperlesstask", "view_global_statistics"]

permissions = Permission.objects.filter(
    content_type__app_label__in=["documents", "paperless"],
    codename__in=codenames,
)
missing = set(codenames) - set(permissions.values_list("codename", flat=True))
if missing:
    print(f"[docutecec] unknown permissions skipped: {sorted(missing)}")

group, _ = Group.objects.get_or_create(name="Demo")
group.permissions.set(permissions)

user, created = User.objects.get_or_create(username=username)
if created:
    user.set_password(password)
    user.save()
user.groups.add(group)
print(f"[docutecec] demo user '{username}' {'created' if created else 'already exists'}")

# First-visit UI for the demo user: Spanish, and the saved views shared with the Demo group
# on the dashboard and sidebar. Only fills what is missing, so later changes in the UI stick.
from guardian.shortcuts import get_objects_for_user

from documents.models import SavedView
from documents.models import UiSettings

ui, _ = UiSettings.objects.get_or_create(user=user, defaults={"settings": {}})
settings = dict(ui.settings or {})
settings.setdefault("language", "es-es")
if "saved_views" not in settings:
    shared = get_objects_for_user(user, "documents.view_savedview", klass=SavedView, accept_global_perms=False)
    ids = sorted(shared.values_list("id", flat=True))
    if ids:
        settings["saved_views"] = {"dashboard_views_visible_ids": ids, "sidebar_views_visible_ids": ids}
        print(f"[docutecec] demo dashboard views: {ids}")
ui.settings = settings
ui.save()
