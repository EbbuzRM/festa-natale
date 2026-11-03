---
name: Festa di Natale
description: The party's account, kept like a printed household ledger.
colors:
  paper: "#f1ece0"
  paper-deep: "#e6dfcf"
  sheet: "#fbf8f1"
  field: "#fffdf8"
  ink: "#141d17"
  ink-soft: "#47534a"
  ink-faint: "#5d6a60"
  bosco: "#123a2b"
  bosco-mid: "#1c5942"
  ottone: "#7d5a20"
  ottone-light: "#c9a869"
  mattone: "#96322a"
typography:
  display:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "clamp(1.65rem, 2.4vw, 2.15rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  total:
    fontFamily: "Spectral, Georgia, serif"
    fontSize: "1.8rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontFamily: "Archivo, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  xs: "3px"
  sm: "4px"
  md: "14px"
  lg: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.bosco}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "0.56rem 0.95rem"
  button-primary-hover:
    backgroundColor: "{colors.bosco-mid}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.56rem 0.95rem"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.62rem 0.7rem"
  chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.xs}"
    padding: "0.32rem 0.6rem"
  chip-active:
    backgroundColor: "{colors.bosco}"
    textColor: "{colors.paper}"
    rounded: "{rounded.xs}"
  panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "1.25rem 1.3rem"
  nav-item-active:
    backgroundColor: "#2e5343"
    textColor: "#fffdf6"
    rounded: "{rounded.sm}"
    padding: "0.52rem 0.5rem"
---

# Design System: Festa di Natale

## Overview

**Creative North Star: "Il conto della festa"**

This is a sheet kept in the house, not a dashboard sold to a company. Every screen behaves like a printed account: a heading in a book serif, rows that align down a right edge, hairline rules instead of floating panels, and a total that closes the page with a double rule. The interface never asks the host to interpret a chart before answering the only question that matters — how much is spent and how much is left.

The material is paper and ink: ivory ground, a deep green shell that reads as the cover of the folder, brass reserved for provenance and forecast, brick reserved for money that has gone wrong. Depth is almost absent; what separates one thing from another is a 1px rule, a change of paper tone, or white space. The one place that lifts is the editing sheet, which behaves like a page laid on top of the desk.

Density is medium and uneven on purpose: the account block is airy and slow, the contact list is tight and scannable, the calendar compresses empty days to a single line so the days that carry work stay visible.

**Key Characteristics:**
- Ivory paper surfaces, deep evergreen navigation shell, brass and brick used only as meaning.
- Spectral for the numbers that decide; Archivo for everything the host reads and types.
- Amounts right-aligned with dotted leaders; totals closed by a double rule.
- Flat by default: hairlines and tone carry structure, shadow appears only on the sheet.
- Rectangular controls with 3–4px corners; no pill chrome, no decorative gradients, no grain.

## Colors

A restrained palette of two papers, two greens and two signals: colour does a job or it is not there.

### Primary
- **Bosco** (#123a2b): the shell. Desktop rail, primary buttons, active filter chips, the confirmed status mark. It is the cover of the folder, never a large field inside the content area.
- **Bosco Mid** (#1c5942): hover of primary actions, links, focus rings.

### Secondary
- **Ottone** (#7d5a20): provenance and forecast. The "passato da Giulia" line, the forecast legend and segment, warning banners. It marks money that is not committed yet.
- **Ottone Light** (#c9a869): the forecast segment inside the meter only; never text.

### Tertiary
- **Mattone** (#96322a): negatives, overrun banners, destructive actions, the struck "scartato" state.

### Neutral
- **Paper** (#f1ece0): the page ground, the page's own voice.
- **Paper Deep** (#e6dfcf): the meter trough, inset bands.
- **Sheet** (#fbf8f1): panel and sheet surfaces, one step brighter than the page.
- **Field** (#fffdf8): input backgrounds.
- **Ink** (#141d17): body and figures.
- **Ink Soft** (#47534a): secondary prose, ledger labels.
- **Ink Faint** (#5d6a60): meta, slot labels, placeholders — still above 4.5:1 on paper.

### Named Rules
**The One Accent Rule.** Brass appears only where money is projected or a contact was passed on; brick only where money is negative or a contact is discarded. Neither is available as decoration.

**The Tinted Ink Rule.** No grey text on a coloured surface: secondary text on the green rail is warm paper at reduced opacity, never a neutral grey.

## Typography

**Display Font:** Spectral (with Georgia, serif)
**Body Font:** Archivo (with Helvetica Neue, Arial, sans-serif)

**Character:** Spectral is the printed voice — a book face with real contrast that makes a figure feel accounted for. Archivo is the working voice: a slightly industrial grotesk that stays crisp at 13px and carries tabular figures for every column of money. Both are self-hosted from `/fonts`, so the app types correctly offline.

### Hierarchy
- **Display** (600, clamp 1.65–2.15rem, 1.1, -0.02em): page titles, the event name, at most one per screen.
- **Total** (600, 1.8rem, 1.0, -0.02em): the one figure that closes the account, "Restano".
- **Title** (600, 0.95rem, 1.4): panel headings and contact names; never larger than the page title.
- **Body** (400, 15px, 1.55, up to 72ch): prose, banner copy, form text.
- **Label** (600, 0.75rem, uppercase, 0.08em): field labels, status counts, slot names — functional text, kept at or above 11px.

### Named Rules
**The Tabular Money Rule.** Every figure that can be compared sits in tabular lining numerals and on a right edge. A column of amounts is read vertically; nothing that sums is centred or proportional.

**The No-Eyebrow Rule.** Headings carry themselves. There is no small tracked label above a page title.

## Layout

A single content column, capped at 1120px, on an ivory ground. From 1000px the shell becomes a 264px evergreen rail with the event wordmark, four icon-navigation items, the primary create action and the storage status at the bottom; below that the app is a mobile column with a sticky bar (current section, storage pill, create) and a four-item tab bar with a 2px active rule.

Inside a view: page head with title and meta on the left, primary action on the right; then the work, separated by 1.35rem. Panels are 14px-rounded sheets that hold their own content, never panels inside panels. The dashboard runs an asymmetric two-column grid (1.5fr / 1fr) whose columns are intentionally different heights — the account is the slow zone, the categories the quick one.

Spacing follows a 4/8/16/24/40 rhythm: 4px inside a control, 8px between related labels, 16px between blocks in a panel, 24px panel padding, 40px between major sections. Rows in a list share a 1px rule and never a card each.

## Elevation & Depth

Flat by default. Surfaces are separated by paper tone and a 1px hairline (rgba(20,29,23,0.12)), not by shadow; there is no border-plus-blur combination anywhere. The single lift in the system is the editing sheet, which carries one soft directional shadow so it reads as a page laid over the desk.

### Shadow Vocabulary
- **Sheet lifted** (`box-shadow: 0 24px 60px -28px rgba(20, 29, 23, 0.55)`): the editing dialog on desktop only; on mobile the sheet is anchored to the bottom edge and uses no shadow.

### Named Rules
**The One Elevation Rule.** Declare elevation once per surface: either a hairline or a shadow, never both. Only the sheet is allowed the shadow.

## Shapes

Paper is cut, not moulded: panels at 14px, sheets at 18px, controls at 3–4px, status marks as hard 7px squares. Nothing is a pill except the small storage tag. Borders are always 1px and always hairline; the only thicker rules are the 1px ink rule above the total and the 3px double rule below it, which are typographic, not decorative. Rotated stamps, dashed hand-drawn frames and circular floating buttons are absent.

## Components

### Buttons
- **Shape:** rectangles with 4px corners (0.56rem × 0.95rem padding), 15px Archivo at 500.
- **Primary:** Bosco ground, paper text; hover shifts to Bosco Mid; disabled drops to a hairline border with Ink Faint text — no washed-out green.
- **Hover / Focus:** background and border transition in 150ms; focus is a 2px Bosco Mid ring with 2px offset, never a glow.
- **Ghost / Danger:** transparent ground with a hairline border; danger uses Mattone text and border, with a 7% tint on hover.

### Chips (filters)
- **Style:** 3px corners, hairline border, Ink Soft text, 0.79rem; counts in tabular figures at 72% opacity.
- **State:** selected fills Bosco with paper text. Categories and statuses share one style so the filter rows stay quiet.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** Sheet, one step lighter than the page.
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px hairline rgba(20,29,23,0.12).
- **Internal Padding:** 1.25–1.5rem, with a 1rem gap between blocks.

### Inputs / Fields
- **Style:** 4px corners, 1px Ink 22% stroke, Field ground, 15px text, 0.62rem × 0.7rem padding.
- **Focus:** border to Bosco Mid plus a 3px 16%-opacity ring; the caret is Bosco.
- **Error:** message in Mattone below the field, 0.86rem; the field keeps its stroke until the value is corrected.

### Navigation
- **Style:** desktop rail on Bosco, 15px items with 18px drawn icons, 4px corners, 13% paper tint on the active item and full-opacity icon; mobile tab bar on paper with a 2px Bosco top rule on the active tab.
- **States:** hover raises paper tint by 8% on the rail, and darkens the label on the tab bar; the current section is also named in the mobile sticky bar.

### The account block (signature)
The reason the system exists. A `<dl>` of ledger rows: label left, dotted leader filling the gap, figure right in tabular numerals, each row closed by a hairline. The total row opens with a 1px ink rule, sets "Restano" in Spectral and the figure at 1.8rem, and closes with a 3px double rule. Underneath, an 8px two-tone meter (Bosco for committed, Ottone Light for forecast) with a textual key. It appears once per screen, on the dashboard, and every other amount in the app borrows its alignment.

## Do's and Don'ts

### Do:
- **Do** right-align every comparable amount and put a dotted leader between its label and its figure.
- **Do** separate blocks with a 1px hairline or paper tone before reaching for a shadow.
- **Do** keep labels at 0.75rem/600/0.08em uppercase and never below 11px.
- **Do** set totals in Spectral and working numbers in Archivo with tabular figures.
- **Do** draw icons as 1.5px-stroke SVG at 18–19px from `src/components/icons.tsx`.
- **Do** compress empty calendar days to one line, so days carrying work keep the height.

### Don't
- **Don't** use cream gradients, noise overlays or `repeating-linear-gradient` stripes as texture.
- **Don't** rotate labels into stamps, or use unicode glyphs (✦ ☏ ▤ ⚙ ✕) as icons.
- **Don't** use pill-shaped buttons or floating circular actions; the create action is a rectangular button in the rail or the mobile bar.
- **Don't** put an eyebrow or kicker above a heading.
- **Don't** colour the left edge of a card, or nest a panel inside a panel.
- **Don't** show grey text on the green rail: tint paper instead.
- **Don't** spend Bosco on large content-area fields; it belongs to the shell and to actions.
