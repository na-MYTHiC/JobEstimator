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
- **Manual updates only** — the app never changes version on its own.

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
Cash Price        = Financed Total x (1 - CASH_DISCOUNT_RATE)
Cash Deal Savings = Financed Total - Cash Price
```

The quote shows **one total**, with every deduction listed above it:

```
Subtotal                 $56,355.75
  Volume Savings         -$4,174.50
  Cash Deal Savings      -$3,320.62
Total                    $48,860.63
```

The cash discount is still taken off the *financed* total, not off the
subtotal — it simply isn't printed as a total of its own. Subtotal only appears
when something is deducted from it; with no savings the Total stands alone.

The cash **price** is derived from the rate and the savings line is the
remainder, not the other way round: the price is what the customer pays and
what the office reconciles against the pricing sheet, so it's the figure that
has to be right to the penny. Taking the savings as the remainder also means
the three rows on screen always add up exactly as printed. The arithmetic runs
in whole cents — at five-figure totals a fractional-dollar multiply is enough
to round a half-cent the wrong way.

`CASH_DISCOUNT_RATE` in `index.html` is the only place the rate lives, so it's
the one line to edit if terms change — the KPI strip, the quote footer and the
volume-tier hint all derive from it and can't drift apart.

**The rate is not "reverse the quoted price's markup."** Cash and finance share
most of that markup and differ by a single factor, so the real discount is much
smaller than undoing the whole thing. Re-derive it from the pricing sheet
before changing it; guessing here under-quotes cash deals by a wide margin.

One rate covers **every family** — Mezzo, Casement, Fusion, Bertha, 143 Series
and both patio door ranges — and it applies to **add-on options** as well,
because the real calculation runs on the job total rather than per line. Every
catalog price in the app, add-ons included, sits on that same markup, which is
what makes a single rate on the total exact rather than approximate.

It must stay applied **once, to the finished total**. Discounting each line and
summing instead drifts by a cent or two on a mixed job, since each line rounds
separately.

The toggle sits in the Pricing Tool next to the totals rather than in Settings,
since it gets flipped mid-appointment. It's saved with the job and **Reset**
returns it to Finance for the next customer.

Note that the app is fully client-side, so the rate is readable in page source
by anyone who looks. It keeps a markup table out of the UI and out of the code,
but it is not a secret — hiding the derivation would require a server to price
against.

## Updates

**The app never updates itself.** Whatever build is installed stays installed
until someone opens the settings cog and taps **Check for updates**. A quote
changing mid-appointment is worse than a quote being a few days old, so this is
deliberate rather than incidental:

- The service-worker cache has a stable name, not a per-deploy one. A versioned
  name means a new worker starts from an empty cache and re-downloads the app,
  which is an auto-update by another route.
- Install only fills cache entries that are *missing*, never overwriting. A
  newly installed worker therefore can't swap the version out from under a
  device that already has one.
- Navigations are served from cache with no background re-fetch, which would
  otherwise quietly stage new code for the next reload.
- There's no periodic update check, no re-check on returning to the
  foreground, and no "update available" banner.

The worker's own *code* does still update on its own. That isn't an app update —
because install never overwrites, adopting a new worker leaves the cached app
version exactly where it was, and it means fixes to `sw.js` can actually land.

**Check for updates** reads the deployed `APP_VERSION` straight off the network
and compares it to what's running. That needs no cooperation from `sw.js`, so a
deploy that forgets to touch the worker is still found. On a mismatch the shell
is re-pulled and the app reloads onto it; there are two independent paths for
that (ask the worker, or evict the cache from the page) so an idle or unclaimed
worker can't leave a device stranded. Offline says so rather than claiming
you're up to date.

### Deploying

GitHub Pages serves `main`, so **a change only reaches phones once it's on
`main`** — a feature branch is invisible to the app. Bump `APP_VERSION` in
`index.html` on each deploy; that string is what the update check compares.
Bumping `VERSION`/`CACHE` in `sw.js` is no longer load-bearing.

## Run it

Open `index.html` in any modern browser — no build step. React, Tailwind, and
Babel load from CDN.

## Stack

- React 18 (UMD)
- Tailwind CSS (CDN with custom theme tokens via CSS variables)
- Babel Standalone (in-browser JSX)
