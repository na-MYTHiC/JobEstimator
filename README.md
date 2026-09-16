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
- **Cash / Finance toggle** — quote the same job on either terms; cash adds a
  Cash Deal Savings line and a Cash Price to the bottom of the quote.
- **Themes** — Tempest (brand orange), Ocean, Forest, Sunset, Royal, and
  Monochrome, in both light and dark mode.
- **Density, sticky totals, and zoom** controls in the settings cog.

## Pricing logic (mirrored from the spreadsheet)

- Mezzo / Bertha / 143 tiers: **1–9 / 10–19 / 20+**
- Casement & Fusion tiers: **1–14 / 15+**
- Color multipliers: White / Beige ×1.00 • Desert Clay ×1.10 • Black / Bronze ×1.25
- Patio doors carry a color multiplier but no volume tier.
- Additional options are flat per-unit.

### Cash vs. finance

Every price in the app — catalog, line items, subtotal, Total — is the standard
financed price. Cash is a discount applied to the finished total, not a second
price list:

```
Cash Deal Savings = Total x CASH_DISCOUNT_RATE
Cash Price        = Total - Cash Deal Savings
```

`CASH_DISCOUNT_RATE` in `index.html` is the only place the rate lives, so it's
the one line to edit if terms change — the KPI strip, the quote footer and the
volume-tier hint all derive from it and can't drift apart. Both figures are
rounded to whole cents against the already-rounded Total, so the three rows on
screen always add up exactly as printed.

The toggle sits in the Pricing Tool next to the totals rather than in Settings,
since it gets flipped mid-appointment. It's saved with the job and **Reset**
returns it to Finance for the next customer.

Note that the app is fully client-side, so the rate is readable in page source
by anyone who looks. It keeps a markup table out of the UI and out of the code,
but it is not a secret — hiding the derivation would require a server to price
against.

## Run it

Open `index.html` in any modern browser — no build step. React, Tailwind, and
Babel load from CDN.

## Stack

- React 18 (UMD)
- Tailwind CSS (CDN with custom theme tokens via CSS variables)
- Babel Standalone (in-browser JSX)
