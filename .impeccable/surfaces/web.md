---
version: 1
slug: "web"
primary_target: "web"
related_targets: []
---

# Surface: demo web (web/)

Mode: Operate. A prospect alone with a link, usually on a phone, uploads their own
receipt and checks the filled form. Tasks: pick or edit the form, upload, read the
result, correct values, copy JSON, try another, get in touch. Must not look like a
SaaS template, must not hide uncertainty, must be light on a phone, must not show
engine internals (line ids, probabilities) unless asked.

Open decisions: contact destination (NEXT_PUBLIC_CONTACT_URL, not given yet); which
sample documents ship publicly (personal data blurred).

## Direction contract

THESIS: The demo reviews the visitor's receipt the way an accountant reviews an
original: marks on the document itself, notes in the margin. Refuses the category
default of a drop zone above a form card.

OWN-WORLD: White sheet on a cool gray-green desk blotter. Ink black text, one
fluorescent highlighter yellow laid over the photo's lines, green ink check for
verified, red ink wavy underline and "?" for review, gray strike for absent.
Atkinson Hyperlegible Next for words, its Mono for figures and keys. Marks are
drawn strokes (check, wave, circle), never icon tiles or cards.

STORY: The visitor sees their own document get read: highlighter sweeps each line
used, and each value lands as a margin note with its mark. They know at a glance
what to trust, fix what is marked, and leave with the data.

FIRST VIEWPORT: Desktop: the sheet (photo or empty sheet with the upload action at
its centre) fills the left two thirds on the blotter; the margin column on the right
holds the form as notes, form selector at its head. Mobile: steps; capture first
(one big "Tomar foto" plus "Subir archivo" and examples), then the sheet as a
strip above the notes.

FORM: candidate 1 of 7 on my ordered list (my pick; roll assigned 4). Seed key
34cff52f. Signature interaction: highlighter sweep over each read line, then the
value travels into its margin note. Raised from the round: state is carried by the
mark's form (check / wave / strike) as well as colour; stepped deployment on phones;
the photo is shown at honest resolution.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
