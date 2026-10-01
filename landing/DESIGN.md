---
name: docutecec
description: Comprobante reading and document management for Ecuadorian companies, presented as a filled tax form.
colors:
  ground: "#e4e9ee"
  sheet: "#ffffff"
  celeste: "#e6eff7"
  spot: "#1f4f7a"
  spot-deep: "#153a5b"
  spot-rule: "#a3b8cb"
  spot-hair: "#d3dee8"
  spot-wash: "#eef3f8"
  ink: "#121518"
  ink-2: "#414c57"
  ink-3: "#5f6b76"
  ok: "#1d6b3b"
  warn: "#b3261e"
  hl: "#f7e53a"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2.625rem, 1.5rem + 4.2vw, 5rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.035em"
    fontVariation: "\"wdth\" 108"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 1.3rem + 2.6vw, 3.25rem)"
    fontWeight: 800
    lineHeight: 1.04
    letterSpacing: "-0.03em"
    fontVariation: "\"wdth\" 104"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.375rem, 1.1rem + 0.9vw, 1.75rem)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
    fontVariation: "\"wdth\" 100"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0.04em"
    fontVariation: "\"wdth\" 80"
  figure:
    fontFamily: "Chivo Mono, ui-monospace, monospace"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.5
    fontFeature: "\"tnum\" 1"
rounded:
  mark: "2px"
  none: "0"
spacing:
  gutter: "clamp(1rem, 0.4rem + 2.4vw, 2.5rem)"
  section: "clamp(2rem, 1rem + 3vw, 4rem)"
  cell: "0.5rem 0.875rem 0.75rem"
  row: "1rem"
components:
  button-primary:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.mark}"
    padding: "0 1.375rem"
    height: "3.125rem"
  button-primary-hover:
    backgroundColor: "{colors.spot-deep}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.spot}"
    rounded: "{rounded.mark}"
    padding: "0 1.375rem"
    height: "3.125rem"
  button-secondary-hover:
    backgroundColor: "{colors.spot-wash}"
  button-small:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.spot}"
    rounded: "{rounded.mark}"
    padding: "0 0.625rem"
    height: "2rem"
  band:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.sheet}"
    typography: "{typography.title}"
    padding: "0.875rem clamp(1rem, 0.4rem + 2.4vw, 2.5rem)"
  panel-head:
    backgroundColor: "{colors.spot}"
    textColor: "{colors.sheet}"
    height: "2.375rem"
    padding: "0 0.875rem"
  casillero-code:
    backgroundColor: "{colors.spot-wash}"
    textColor: "{colors.spot}"
    typography: "{typography.figure}"
    width: "2.75rem"
  field-input:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.none}"
    height: "2.25rem"
  option-box:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.mark}"
    padding: "0.625rem 0.75rem"
  option-box-checked:
    backgroundColor: "{colors.spot-wash}"
  tag-chip:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.spot}"
    typography: "{typography.label}"
    padding: "0 0.375rem"
---

# Design System: docutecec

## Overview

**Creative North Star: "The Filled Tax Form"**

Every surface is a form sheet pre-printed in a single petrol-blue spot ink, with docutecec's own data typed into its casilleros. The sheet sits on a cool grey desk, framed by one spot-ink border and a soft paper shadow. Structure comes from ruled lines, not cards: sections open with solid spot-ink bands, content lives in ruled boxes and definition rows, and every filled value is set in a typewriter-like mono. Density is that of a real administrative form: tight rows, small narrow labels, generous display lines only where the page speaks.

The world is light only, because a form is paper. Color is almost monochrome: spot ink, its tints, near-black ink and white. A carbon-copy celeste sheet marks a second paper (the Gestor section). Green and red appear only as status marks on a field, and a yellow highlighter appears only where a document is being read.

**Key Characteristics:**
- One spot ink (petrol blue) prints every rule, band, label and code.
- Values typed in Chivo Mono; labels and headings in Archivo at varying widths.
- Ruled boxes with three-digit casillero codes are the base unit of layout.
- Near-square corners (2px) or none; hairlines at 1px, structural rules at 1.5px.
- Status is carried by a mark (check, query, dash) plus a word, never color alone.

## Colors

A one-ink print palette: petrol spot and its tints on white paper, near-black type, and three reserved marks.

### Primary
- **Petrol Spot Ink** (spot): the only printing ink. Borders of the sheet and every boxed field (1.5px), section bands, casillero codes, field labels, links, focus rings, primary button fill, footer ground.
- **Deep Petrol** (spot-deep): hover state of spot fills and the 2px inset bottom edge that gives primary buttons their press weight.

### Neutral
- **Desk Grey** (ground): the surface the sheet lies on; visible only at the page margins.
- **Form White** (sheet): the sheet itself and every field box.
- **Carbon Celeste** (celeste): the carbon-copy paper of a secondary section (Gestor). One section per page at most.
- **Spot Rule** (spot-rule): 1px interior rules between rows and columns; inactive chip and option borders.
- **Spot Hair** (spot-hair): the finest rule, between casilleros and table columns.
- **Spot Wash** (spot-wash): tinted code cells, table heads, footers of panels, hover and checked states, focus-within fill of a field.
- **Typed Ink** (ink): headlines and every typed value.
- **Ink 2** (ink-2): body copy, descriptions, meta.
- **Ink 3** (ink-3): placeholders, absent values, muted invoice text.

### Status marks
- **Verified Green** (ok): "Listo" check marks and the verified-sum line.
- **Query Red** (warn): "Revisar" marks and the wavy underline on a value that needs review.
- **Highlighter Yellow** (hl): the line currently being read on a comprobante and search-hit marks. At 50% for lines already read, 22% for the casillero being filled.

### Named Rules
**The One Ink Rule.** Everything printed on the form is spot or a tint of spot. A second hue is never used for decoration.

**The Status Mark Rule.** Green, red and yellow exist only as marks on data: verified, needs review, being read. Never as section color, button fill or illustration.

**The Carbon Copy Rule.** Celeste marks a different paper, one section at a time; it is not a card background.

## Typography

**Display Font:** Archivo (variable width axis), with system-ui fallback
**Body Font:** Archivo
**Label/Mono Font:** Chivo Mono for every typed value

**Character:** One Omnibus-Type family printed at different widths: expanded and heavy for what the page says aloud, condensed and small for what the form pre-prints. Chivo Mono, from the same foundry, is the typewriter that fills the boxes.

### Hierarchy
- **Display** (800, step-4, 0.98, wdth 108): hero line and closing line only. The second clause may turn spot.
- **Headline** (800, step-3, 1.04, wdth 104, max 22ch): the statement that opens each section's body.
- **Title** (700, step-2, 1.2): section band text; the section name inside the band goes to 800 at wdth 112, separated by a faded middle dot.
- **Body** (400, step-0 1.0625rem, 1.55, max 60ch): explanatory copy in ink-2. Lede at step-1.
- **Label** (600, step--2 0.6875rem, 0.04em, wdth 80, uppercase, spot): the pre-printed name of a field, column head or signature line. Always attached to a value or input it names.
- **Figure** (Chivo Mono 500, 0.9375rem to 1rem, tabular): any value typed into a field: RUCs, amounts, dates, hosts, inputs, the WhatsApp message preview, the legal line. Totals step up to 1.1875rem at 600.

### Named Rules
**The Typed Value Rule.** If it is data a person or the system wrote into the form, it is mono. If the form printed it, it is Archivo.

**The Width Axis Rule.** Hierarchy moves along the width axis as much as weight: labels 80 to 90, body 100, display 104 to 112, wordmark 118.

## Layout

The page is one sheet (max 90rem) centered on the desk, with a fluid margin that collapses to zero on small screens. Inside, a 12-part grid expressed as 5fr / 7fr splits (text left, form right); the Gestor section runs 6/6 with the form on the left. The fluid gutter (spacing.gutter) is the only horizontal inset. Section bodies use the section rhythm vertically.

A sticky header strip (4rem, white at 96%) carries wordmark, nav and the WhatsApp action, closed by a 1.5px spot rule. Under the hero, an identification strip of four boxed fields restates the offer as form data. Sections stack full-bleed inside the sheet, each closed by a 1.5px spot rule and opened by a band.

Breakpoints: at 1100px every split collapses to one column (sticky side panels release); at 760px the nav hides, the strip goes single column, bands stack name over text, tables become stacked records and actions go full width. Component internals collapse at 900px (hero form) and 720px (quote form).

## Elevation & Depth

Flat print. Depth is paper on a desk, not interface layers: the sheet and one clipped document carry a single soft paper shadow; everything else separates by rules and tint.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 2px rgb(21 58 91 / 0.08), 0 18px 40px -18px rgb(21 58 91 / 0.35)`): the form sheet on the desk, and a comprobante clipped onto a form.
- **Press edge** (`box-shadow: inset 0 -2px 0 var(--spot-deep)`): bottom edge of primary buttons only.
- **Field underline** (`box-shadow: 0 1.5px 0 var(--spot)`): thickens a field's baseline on focus.

### Named Rules
**The Paper Only Rule.** A shadow means a separate piece of paper. Panels, cards and buttons printed on the sheet stay flat.

**The Clipped Document Rule.** A source document laid on the form may tilt slightly (-1.2deg) with the sheet shadow; it straightens on narrow screens.

## Shapes

Rectilinear. Corners are square or 2px (rounded.mark) on interactive elements so focus rings sit cleanly; boxes, bands, tables and code cells are square. Rules come in two weights: 1.5px spot for structure (sheet, boxed panels, section closes, input baselines), 1px spot-rule or spot-hair inside. Dashed spot borders mean a suggestion you can take. Tick boxes are squares filled with a typed X built from two crossed strokes. The only irregular shape is the highlighter: an uneven radius (`2px 5px 3px 6px / 6px 3px 5px 2px`) that reads as a marker stroke.

## Components

### Buttons
Printed, firm, near-square.
- **Shape:** gently squared (2px).
- **Primary:** spot fill, white 700 text, 3.125rem tall (2.5rem in the header, 3rem in the quote form), press-edge inset, optional 20px icon.
- **Hover / Focus:** fill deepens to spot-deep; active nudges down 1px; focus is a 2px spot outline offset 2px.
- **Secondary:** white with 1.5px spot border and spot text; hover fills spot-wash.
- **Small (replay, empty-state):** 2rem, 1px spot border, step--1 700; disabled turns border spot-rule and text ink-3.

### Section Band
The form's section heading: a full-width spot band, white title type, name at 800 expanded, a faded middle dot, then the section's claim at 500.

### Boxed Panel
A 1.5px spot-bordered white box headed by a 2.375rem spot strip with uppercase condensed title (wdth 82); optional spot-wash footer with a tally and a small button. Hero form, archive and quote form all use it.

### Casillero (signature)
A grid row: a 2.75rem spot-wash code cell with a three-digit mono code, a label above a typed mono value, and a status mark at the right. Rows divide by spot-hair. The active casillero takes the 22% highlighter; values type themselves with a 2px blinking spot caret; the total casillero is followed by a cross-check row that fades from 55% to full green when the sum verifies.

### Inputs / Fields
- **Style:** no box; a 1.5px ink baseline, transparent ground, mono value at 1rem, sans placeholder in ink-3. The cell carries code and label.
- **Focus:** baseline turns spot and doubles via the field underline; the whole cell fills spot-wash.
- **Select:** same baseline with a spot chevron.

### Option Boxes and Chips
- **Option box:** 1px spot-rule border, 2px corners, square tick box; hover borders spot; checked fills spot-wash with a spot border and an ink X in the box.
- **Filter chip:** 2rem, same tick logic with a spot X.
- **Suggestion chip:** dashed spot border, mono text; solid when pressed.
- **Tag chip:** square, 1px spot-rule border, spot label type.
- **Status legend:** bordered in currentColor with icon and word, in ok, warn or ink-3.

### Navigation
Header links in ink at 600, 0.9375rem, with a 2px transparent bottom border that turns spot on hover. Hidden under 760px, leaving wordmark and the WhatsApp button. Footer is a spot ground with white links and uppercase condensed column heads.

### Wordmark
"docutec" in Archivo 800 at wdth 118, followed by "ec" inside a 2px-bordered box, the brand as a filled field. Spot on paper, white on spot.

### Motion
Short and functional: 0.15s color and translate on controls; 0.2 to 0.4s with the expo-out ease for field fills, tags sliding in 4px, and the verify row. Reduced motion collapses everything to 1ms.

## Do's and Don'ts

### Do:
- **Do** build every panel as a ruled box: 1.5px spot outside, 1px spot-rule or spot-hair inside.
- **Do** set every typed value (codes, amounts, dates, hosts, inputs, messages) in Chivo Mono.
- **Do** pair every field label with the value or input it names; labels are the form's pre-print.
- **Do** open sections with a spot band, and close them with a 1.5px spot rule.
- **Do** carry status with an icon and a word as well as color.
- **Do** mark synthetic demonstration data as such inside the panel head.

### Don't:
- **Don't** introduce a second decorative hue; green, red and yellow are status marks only.
- **Don't** use rounded cards, pills or radii above 2px (the highlighter stroke is the sole exception).
- **Don't** add shadows to anything that is not a separate piece of paper.
- **Don't** use the uppercase label style as a free-floating heading above a headline; it only names a field.
- **Don't** use a dark theme; the form is paper.
