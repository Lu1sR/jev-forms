# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js for `web/` (decided in the repository README). The Python `engine/` serves
the HTTP API; both deploy to Railway, `web` public and `engine` on the private
network only.

## Users

A prospective client who received a link and tries the demo alone, with no one
presenting it: they upload photos or PDFs of their own receipts, often from a phone,
to judge whether the reading is trustworthy. The target sector is not defined yet,
so the demo must show the general capability rather than one industry's workflow.

## Product Purpose

Read an Ecuadorian receipt (factura, nota de venta or precuenta; PDF or photo) and
fill a form automatically. Success for the demo: the visitor sees their own document
turned into correct field values in a few seconds and understands how far to trust
each value without being told.

## Positioning

Per-field confidence instead of a single "extracted" result: every value is green
(confident and cross-checked), yellow (review it) or empty (not in the document), and
the visitor can see the exact line of the document each value came from. Amounts are
cross-checked (subtotal + IVA + service = total) and SRI invoices against their
access key.

## Operating Context

- Visitors bring real documents: crumpled thermal receipts photographed on a table at
  an angle, SRI electronic invoices as PDFs, restaurant pre-bills with a 10% service
  charge and handwritten customer data.
- Processing takes about 1–3 s per document (OCR plus one matcher call).
- The form to fill is sent by the caller; the engine ships a preset form (`sorteo`)
  and accepts any list of fields.

## Capabilities and Constraints

- Engine API: `POST /extract` (file plus form JSON or `form_id`), `GET /forms`.
  Response shape documented in `engine/README.md`.
- Each line comes back with a relative bounding box; page images are returned as
  base64 when `previews=true`.
- Accepted files: PDF, JPG, PNG, WEBP, HEIC; 15 MB maximum.
- UI language: Spanish (Ecuador).
- Known limitations: two documents in one photo get their values mixed; text fields
  may keep the printed label.

## Brand Commitments

No brand yet: neutral name "jev-forms". No logo, colors or voice have been set.

## Evidence on Hand

- Local sample documents in `engine/samples/` (not in git: real personal data).
- No customers, testimonials, accuracy benchmarks or pricing exist; the demo must not
  claim any.

## Product Principles

1. The visitor's own document is the proof: nothing on screen should compete with it.
2. Show trust honestly: yellow and empty are useful answers, not failures to hide.
3. Every value must be traceable to the line of the document it came from.
4. Works unattended: no step should need someone explaining it.
5. Phone first for capture, never at the expense of reading the result.

## Accessibility & Inclusion

Status must never rely on color alone (green/yellow/empty also need a label or
icon); photos come from phones in bad light, so the UI must stay readable outdoors.
