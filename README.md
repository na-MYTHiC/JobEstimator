# Job Estimator

A single-page sales-rep pricing tool for Tempest Windows, built from the
master pricing spreadsheet. Pick a product type, quantity, and color and the
estimate calculates instantly — including volume-tier pricing, color
multipliers, and a running job total.

## Features

- **Pricing Tool** — add lines, edit quantities inline, and see live totals
  with volume savings broken out separately.
- **Catalog** — every par price and size limit from the master sheet, laid
  out side by side just like the spreadsheet.
- **Volume-tier optimizer** — flags when you're a few units shy of the next
  tier and shows the exact dollar savings.
- **Themes** — Tempest (brand orange), Ocean, Forest, Sunset, Royal, and
  Monochrome, in both light and dark mode.
- **Density, sticky totals, and zoom** controls in the settings cog.

## Pricing logic (mirrored from the spreadsheet)

- Mezzo / Bertha / 143 tiers: **1–9 / 10–19 / 20+**
- Casement & Fusion tiers: **1–14 / 15+**
- Color multipliers: White / Beige ×1.00 • Desert Clay ×1.10 • Black / Bronze ×1.25
- Patio doors carry a color multiplier but no volume tier.
- Additional options are flat per-unit.

## Run it

Open `index.html` in any modern browser — no build step. React, Tailwind, and
Babel load from CDN.

## Stack

- React 18 (UMD)
- Tailwind CSS (CDN with custom theme tokens via CSS variables)
- Babel Standalone (in-browser JSX)
