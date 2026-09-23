from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

import yaml

FORMS_DIR = Path(__file__).parent
DEFAULT_FORM = "sorteo"


@dataclass(frozen=True)
class FieldDef:
    key: str
    label: str
    type: str
    question: str
    hints: tuple[str, ...] = ()
    hidden: bool = False


@dataclass(frozen=True)
class FormDef:
    id: str
    title: str
    fields: tuple[FieldDef, ...] = field(default_factory=tuple)

    @property
    def visible(self) -> list[FieldDef]:
        return [f for f in self.fields if not f.hidden]


@lru_cache
def load_form(form_id: str = DEFAULT_FORM) -> FormDef:
    path = FORMS_DIR / f"{form_id}.yaml"
    if not path.is_file() or path.parent != FORMS_DIR:
        raise KeyError(f"Formulario desconocido: {form_id}")
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    return FormDef(
        id=raw["id"],
        title=raw["title"],
        fields=tuple(
            FieldDef(
                key=f["key"], label=f["label"], type=f["type"], question=f["question"],
                hints=tuple(f.get("hints", ())), hidden=bool(f.get("hidden", False)),
            )
            for f in raw["fields"]
        ),
    )


def list_forms() -> list[FormDef]:
    return [load_form(p.stem) for p in sorted(FORMS_DIR.glob("*.yaml"))]
