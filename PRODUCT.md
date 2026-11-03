# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the host, who is organizing a Christmas party on their own. They are the only user and the only person who types data in. They use the same app on two devices with equal weight: a phone, held in one hand while talking to someone (a friend who knows an artist, a neighbour with tables, a baker), and a laptop in the evening to review the numbers. There is no second operator and no one to hand a task to.

## Product Purpose

Keep every lead for the party — artists, materials, services — with who provided it, what it costs, whether it is confirmed, and which day and slot it occupies, so the host always knows whether the event still fits the budget (initially 3.000 €) and what is still missing. Success is: an idea heard on the phone becomes a stored contact before the conversation ends, and the host can answer "quanto ho speso e quanto mi resta" in one glance, on either device.

## Positioning

It is the only record of the party that exists: the phone in hand and the evening laptop see the same data, and the budget verdict is on the first screen rather than behind a report. It replaces a paper notebook plus a scattered chat, without asking the host to maintain a spreadsheet twice.

## Operating Context

- Weeks of preparation, not years; the app is used in bursts and then abandoned after the event.
- Data is entered standing up, one-handed, on a phone, often from a name heard out loud; details are completed later at the laptop.
- The budget number changes as quotes arrive; the host needs the remaining amount and the projected total, not a ledger.
- Contacts are also wanted outside the app: an Excel file the host can open, print or send to family.
- Network is not guaranteed; the app must work with no connection and warn when data lives only on one device.
- Language is Italian, with Italian money and date formats.

## Capabilities and Constraints

- Contacts: name, surname, company, category (artista / materiali / servizi), type, phone, WhatsApp, email, price, who provided the contact, provenance, status, notes. Only a name is required for a quick save.
- Budget: editable total (3.000 € default), committed by confirmed contacts, projection including contacted ones, remaining amount, overrun flagged.
- Calendar: party days (default December weekend plus 23–28), morning/afternoon/evening slots, cost per day, total, budget warning. Each appointment also records the venue (stage, lemon houses, greenhouses) where it happens.
- Entertainment: a countdown of the slots still to fill (default 30), filled by artists put in the calendar and split by venue.
- To-do list: a short checklist of errands, saved with the event.
- Export/import Excel (three sheets) without duplicating contacts; JSON backup.
- Storage: local-first in the browser, optional small Supabase database for safety; no login, no multi-user sync, data tied to one browser unless the database is configured.
- Installable PWA, offline, same screens on phone and desktop.
- OCR of handwritten notes is explicitly out of scope.
- No fabricated contacts, prices or event facts: demo data must be labeled as such.

## Brand Commitments

The host rejected the first visual pass as "too AI-looking". The new surface must not read as a generic generated dashboard: no default component-library look, no decorative gradients standing in for hierarchy, no festive kitsch (no Santa, no snowflakes, no red-and-green cliché).

Standing direction (host's choice, 2026-10-30): keep the warm paper world — ivory ground, ink green, brass accent — and execute it at the craft level of Copilot Money / Monarch: warm paper, curated type, large tabular figures, immaculate spacing. No new visual world; refinement, not redesign.

## Evidence on Hand

No real contacts, quotes or event photos are in the repository. The only real facts are the budget of 3.000 €, the Italian language, and the party being a Christmas one. Anything else is placeholders.

## Product Principles

1. The budget verdict answers itself: remaining money and overrun are visible without navigating.
2. Adding a contact is faster than writing it on paper, one-handed.
3. Same truth on both devices; a warning is better than a silent divergence.
4. The app is a tool for a few weeks, not a product to grow: no accounts, no settings maze, no features that need maintenance.
5. Data outlives the app: Excel and JSON exports are first-class, not an afterthought.
