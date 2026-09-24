---
name: jev-forms
description: The visitor's own receipt, reviewed on the desk the way an accountant marks an original.
colors:
  blotter: "#d6ddd7"
  paper: "#ffffff"
  paper-inset: "#f3f5f3"
  ink: "#1b1d1c"
  ink-deep: "#000000"
  ink-2: "#4a504c"
  ink-3: "#6a716c"
  rule: "#d3d8d4"
  rule-strong: "#aeb5b0"
  highlighter: "#f7e53a"
  highlighter-soft: "#fbf2a0"
  highlighter-pressed: "#f2d90f"
  ok-ink: "#13703f"
  warn-ink: "#bf2f28"
  pen: "#1f47c9"
  pen-deep: "#16389f"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 1.2rem + 2.2vw, 2.625rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  lede:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "1.1875rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible Next, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1.4
  figure:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "1.1875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1"
  figure-small:
    fontFamily: "Atkinson Hyperlegible Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1
rounded:
  none: "0px"
  hairline: "2px"
  sm: "3px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  base: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
  2xl: "2.5rem"
  3xl: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 1.25rem"
    height: "3rem"
  button-primary-hover:
    backgroundColor: "{colors.ink-deep}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 1.25rem"
    height: "3rem"
  button-pen:
    backgroundColor: "{colors.pen}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0 1rem"
    height: "2.25rem"
  button-pen-hover:
    backgroundColor: "{colors.pen-deep}"
  link-pen:
    textColor: "{colors.pen}"
    typography: "{typography.label}"
  input-field:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 0.5rem"
    height: "2.25rem"
  input-draft:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.sm}"
    padding: "0 0.625rem"
    height: "2.5rem"
  sheet:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "1.5rem 1.5rem 1.75rem"
  note-number:
    textColor: "{colors.ink-2}"
    typography: "{typography.figure-small}"
    rounded: "{rounded.pill}"
    size: "1.5rem"
  status-chip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0.625rem 1rem"
  code-well:
    backgroundColor: "{colors.paper-inset}"
    textColor: "{colors.ink}"
    typography: "{typography.figure-small}"
    rounded: "{rounded.sm}"
    padding: "0.875rem 1rem"
---

# Design System: jev-forms

## Overview

**Creative North Star: "The Accountant's Desk"**

Everything happens on a desk. The page background is a cool gray-green blotter; on it lie square-cornered white sheets: the visitor's document, and a second sheet that holds the form as margin notes. Review is done the way an accountant reviews an original: a fluorescent highlighter laid over each line that was used, and ink marks drawn beside it (a green check for confident, a red wavy underline with a query for review, a gray strike for absent, a blue pen tick for a correction). Nothing is a card, a tile or a badge; everything is paper or a mark made on paper.

The system is light only (visitors check results on phones in daylight) and deliberately plain around the document so the visitor's own receipt stays the loudest thing on screen. Type is Atkinson Hyperlegible throughout: Next for words, Mono for every figure, key and reference number, so 0/O, 1/l and 5/S are never ambiguous. Density is moderate: one column of notes, each separated by a hairline rule like lines on a ledger.

Motion is the reading itself. The highlighter sweeps each used line in sequence (110ms stagger), marks draw in as pen strokes, and each value travels from its line into its note. At rest nothing moves; under reduced motion everything lands at once.

**Key Characteristics:**
- Gray-green blotter, white paper sheets with a soft ambient shadow, no rounded cards.
- One fluorescent highlighter yellow as the only saturated fill; ink colors (green, red, blue) appear as strokes and text, never as fills of large areas.
- State carried by the form of a hand-drawn mark as well as its colour.
- Atkinson Hyperlegible Next for words, Atkinson Hyperlegible Mono for figures and keys.
- Motion reenacts the review: sweep, draw, land.

## Colors

A near-neutral paper-and-ink palette with one fluorescent highlighter and three ink colours that each mean exactly one thing.

### Primary
- **Fluorescent Highlighter** (highlighter): the one saturated fill. Laid over read lines on the document with `mix-blend-mode: multiply`, under the display word in the hero, under text selection, behind the value in flight, and as the active-note wash (35% to 12% alpha gradient). Lines that need review get **Pale Highlighter** (highlighter-soft), which also marks the selected form template. **Pressed Highlighter** (highlighter-pressed) is the active line on the document.

### Secondary
- **Blue Pen** (pen): the visitor's own hand. Links, focus rings, caret, the correction draft field, the save button, correction-mode line targets, the pick banner, and the "corrected" status. **Deep Pen** (pen-deep) is its hover.

### Tertiary
- **Check Green** (ok-ink): the confident status: check mark, note number ring, tally count, and the dot in the wordmark.
- **Review Red** (warn-ink): the review status: wavy underline under the value, wave-and-query mark, number ring, errors. Also the ledger pad's double margin rule at 40% alpha.

### Neutral
- **Desk Blotter** (blotter): page background and browser theme colour. Never used for a surface that holds content.
- **Sheet White** (paper): every content surface: the document page, the blank upload sheet, the notes sheet, inputs.
- **Inset Paper** (paper-inset): recessed wells on paper: the JSON output, disabled selects.
- **Ink** (ink): body text, primary buttons, the reading chip, the 2px rule that opens the after-results block. **Ink Black** (ink-deep) is only the hover of ink buttons.
- **Ink 2** (ink-2): secondary text: ledes, note labels and reasons, file names.
- **Ink 3** (ink-3): tertiary text and the absent state: empty values, hints, neutral number rings, the strike mark.
- **Ledger Rule** (rule) and **Strong Rule** (rule-strong): hairlines between notes and fields, input borders, the dotted blank-line of a note still being read, the scrollbar.

### Named Rules
**The One Highlighter Rule.** Yellow is the only colour allowed to fill an area, and it only ever means "this line was read" (or the active/selected thing on paper). No yellow buttons, banners or badges.

**The Ink Means Status Rule.** Green, red and blue are ink: they colour strokes, rings and text. Green is confident, red is review, blue is the visitor's pen. None of them is ever decorative.

## Typography

**Display Font:** Atkinson Hyperlegible Next (with system-ui, sans-serif)
**Body Font:** Atkinson Hyperlegible Next (weights 400, 500, 700, 800 loaded)
**Label/Mono Font:** Atkinson Hyperlegible Mono (weights 400, 500)

**Character:** A legibility face used with conviction: heavy 800 headings with tight tracking against a calm 400 body, and a mono sibling that makes every figure read as data taken off the document.

### Hierarchy
- **Display** (800, fluid step 3, 1.08, -0.02em): the one hero line on the blank sheet, with its key word under a highlighter stroke that sweeps in.
- **Headline** (800, step 2, 1.15, -0.02em): the notes sheet's form title.
- **Title** (700, step 1, 1.3): each extracted value in a note.
- **Lede** (400, step 1, 1.45, max 34ch, ink-2): the one explanatory paragraph under the display line.
- **Body** (400, step 0, 1.5): default text, buttons (at 700), form legends.
- **Label** (700, step -1): note labels, status words, tally, links in the notes sheet. Sentence case, never uppercase-tracked.
- **Figure** (Mono 500, step 1, tabular numerals, -0.01em): money, dates, RUC and invoice numbers as values; the correction draft field; file names at step 0.
- **Figure small** (Mono 500, 0.75rem / 0.6875rem): reference numbers inside the note rings and document callouts; the JSON well at 400.
- **Wordmark** (800, 1.25rem, -0.03em): "jev·forms", the middle dot in Check Green.

### Named Rules
**The Figures Are Mono Rule.** Any value that is a number or key (money, date, RUC, invoice number, reference number, JSON) is set in Atkinson Hyperlegible Mono with tabular numerals. Words stay in Next.

## Layout

Desktop (above 900px) is a two-column desk inside a 90rem container with 2rem side padding: the sheet column (flexible) and the notes sheet (21rem to 27rem), 2.5rem apart. The sheet column is sticky (1.25rem from top) so the document stays beside the notes while they scroll. Once a document is loaded, both columns size to the document and centre together on the desk rather than stretching. The document gets a 52px right gutter for marks on lines that run to its edge; its width is derived from its aspect ratio so portrait receipts are shown at readable, honest resolution.

At 900px and below it becomes one column (0.75rem side padding): capture first, then the document as a strip (capped at 40dvh tall once read) above the notes. Action rows stack full width. Pointer type, not width, decides the lead action: on coarse pointers "Tomar foto" leads; on fine pointers the file picker leads and the drop hint appears.

Spacing is rem-based on a quarter-rem rhythm; the common gaps are 0.375, 0.625, 0.75, 1, 1.25 and 1.5rem, with 2.5 to 3rem reserved for the desk gutter and the blank sheet's inner margins.

## Elevation & Depth

Depth is physical and minimal: paper lying on a desk. Every sheet carries the same soft two-layer shadow; things held above the paper (the reading chip, the pick banner, a sheet with a file dragged over it) take the lift shadow. Nothing on the paper itself is elevated; notes and fields are separated by hairline rules, not shadows.

### Shadow Vocabulary
- **Sheet** (`box-shadow: 0 1px 1px rgb(27 29 28 / 0.06), 0 8px 24px -6px rgb(27 29 28 / 0.18)`): every paper surface at rest.
- **Lift** (`box-shadow: 0 2px 4px rgb(27 29 28 / 0.08), 0 14px 32px -10px rgb(27 29 28 / 0.28)`): floating status (reading chip, pick banner) and the blank sheet while a file is dragged over it (plus a 3px pen ring and a 3px rise).
- **Ink key** (`box-shadow: 0 2px 0 rgb(0 0 0 / 0.25), 0 6px 14px -6px rgb(27 29 28 / 0.5)`): only the primary ink button, which presses down 1px on active.
- **Paper halo** (`filter: drop-shadow(0 0 1.5px #fff) x2`): marks drawn over the photo, so a stroke stays legible over printed text.

### Named Rules
**The Paper On A Desk Rule.** Only sheets and things held above them cast shadows. Content inside a sheet is flat and divided by rules.

## Shapes

Sheets are square-cornered paper (0 radius). Controls take a barely-there 3px corner; focus rings round to 2px. The only circles are the reference-number rings on notes (pill) and the callouts on the document, which use a slightly uneven radius (`50% 46% 52% 48% / 48% 52% 46% 50%`) so they read as circled in pen. Highlighter strokes have ragged uneven ends (`2px 5px 3px 6px / 6px 3px 5px 2px`) and are rotated to the angle of the line they cover. Marks are open SVG strokes with round caps, 2 to 2.6 units wide, never filled shapes.

The blank upload sheet is a ledger pad: a red double margin rule (40% alpha) and one blue header rule (28% alpha) drawn as background gradients.

## Components

### Buttons
Few, solid and tactile; one lead action per moment.
- **Shape:** gently squared (3px), 3rem tall in the capture area.
- **Primary:** ink fill, paper text, 700 weight, 0 1.25rem padding, the ink key shadow; hover goes to pure black; active presses down 1px. An inline SVG line icon (1.375rem) may lead the label.
- **Secondary:** paper fill with a 1.5px ink border; hover to a faint gray-green paper.
- **Pen button:** the save action inside a correction, pen fill, 2.25rem tall.
- **Dashed ghost:** "add field" in the form editor, 1px dashed ink-2 border that turns solid on hover.
- **Links as actions:** pen blue, 700, 1px underline at 0.25em offset that thickens to 2px on hover. The top-bar contact link instead sits on a highlighter band that rises on hover.

### Inputs / Fields
- **Style:** paper background, 1px strong-rule border, 3px corners, 2.25rem tall. Hint inputs are 2rem and dashed.
- **Correction draft:** 1.5px pen border, Mono figure type, 2.5rem tall; caret is pen blue everywhere.
- **Focus:** 2px pen outline, 2px offset.
- **Disabled:** inset paper background, rule border, ink-2 text.

### Template choice
Radio options as bordered slips (1px rule, 3px, 0.625rem 0.75rem padding). Hover strengthens the border; selected gets an ink border and a pale-highlighter band behind the title.

### Margin note (signature)
The form rendered as notes in a margin: a numbered ring (1.5rem, 1.5px border, Mono) in a 1.75rem column, then label (label type, ink-2), status word with its drawn mark, the value (title type; figures in Mono), and a reason line. Notes are divided by 1px rules. Status changes the ring, status word and mark colour together; review values also get a 1.5px red wavy underline; absent values drop to ink-3 at 400. While reading, each value is a dotted blank line with a highlighter scan passing over it. The active note (hovered or focused, or its line on the document) takes the fading highlighter wash.

### Document marks (signature)
On the document, each used line gets a highlighter stroke at its own angle, then a tag: the drawn status mark plus the reference number circled in pen, placed after the line on blank paper or in the right gutter. Hover or focus on a note outlines its line with a 2px ink ring on pressed highlighter. In correction mode every line becomes a dashed pen target that fills with highlighter on hover/focus.

### Status chip and banner
Floating messages are small, held above the paper: the reading chip (ink, with a looping highlighter stroke) and the pick banner (pen), both 3px corners with the lift shadow.

### Motion
One easing, `cubic-bezier(0.16, 1, 0.3, 1)`, for everything that sweeps, draws or lands. Highlighter sweep 460ms per line on a 110ms stagger; marks draw in 400 to 420ms; the value flies to its note in 620ms; state transitions 150 to 200ms. Reduced motion collapses all of it.

## Do's and Don'ts

### Do:
- **Do** put every content surface on square-cornered paper with the sheet shadow, on the blotter.
- **Do** carry status by mark shape and colour together: check (green), wave with query (red), strike (ink-3), pen tick (blue), always with a status word.
- **Do** set every figure, key and reference number in Atkinson Hyperlegible Mono with tabular numerals.
- **Do** tie every value to its line: matching reference numbers on the note ring and the document callout, and a shared active state between them.
- **Do** draw marks as open round-capped strokes that animate in with the one ease-out curve.

### Don't:
- **Don't** fill areas with green, red or blue; they are inks, used for strokes, rings and text.
- **Don't** use yellow for anything but the highlighter (read lines, the active or selected thing, selection).
- **Don't** put content in rounded cards or icon tiles; notes and fields are divided by hairline rules on a sheet.
- **Don't** add a dark theme; the desk is light only.
- **Don't** let chrome compete with the document: one wordmark, one contact link, no navigation bar.

### Known limitation
When the paper after a line is not blank, its tag moves to the right gutter at the line's height with no connector, so on two-column documents it can sit beside unrelated text. Mitigation in the build: hovering or focusing a note outlines its line. This is an open item, not a pattern to repeat.
