# NyumbaLink — Web Client

The web frontend for NyumbaLink, a platform that connects tenants and landlords
across Kenya directly — verified listings, no agents, no brokerage fees. This
repo is the tenant/landlord-facing app; the admin surface is a separate project.

Backend lives in [`../propertyHubBackend`](../propertyHubBackend).

## Status

Landing page and the signup **role gate** are built. The flows behind signup,
login, and browse are stubbed pending the next milestone (they ship with the
tenant and landlord dashboards). Nothing on the landing page calls the backend
yet — all copy, pricing, and stats are static.

| Route               | State                                                 |
| ------------------- | ----------------------------------------------------- |
| `/`                 | Landing page — complete                               |
| `/signup`           | Role chooser — complete (see [Role gate](#role-gate)) |
| `/signup/details`   | Placeholder; holds the routing guard                  |
| `/login`, `/browse` | Placeholder stubs so header/CTA links are never dead  |

## Stack

- **React 19** + **TypeScript** on **Vite 7**
- **Tailwind CSS v4** (via `@tailwindcss/vite`) — tokens in `src/index.css`
- **shadcn/ui** (new-york style) over Radix primitives
- **react-router-dom v7**
- **lucide-react** icons
- Fonts: **Inter** (sans) + **Fraunces** (serif headings), loaded in `index.html`

Web only, mobile-responsive. Targets checked at 375 / 768 / 1440.

## Getting started

```bash
npm install
npm run dev        # Vite dev server
```

| Script              | Does                                        |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Start the dev server                        |
| `npm run build`     | Type-check (`tsc -b`) then build to `dist/` |
| `npm run typecheck` | Types only, no emit                         |
| `npm run preview`   | Serve the production build locally          |

Regenerating the favicons (only needed if the logo changes):

```bash
python3 scripts/generate-favicons.py   # requires Pillow
```

## Project structure

```
src/
  main.tsx · App.tsx           # entry + router
  index.css                    # Tailwind + design tokens (light/dark)
  assets/                      # source logo (not shipped unless imported)
  components/
    brand/Logo.tsx             # inline-SVG mark + wordmark
    layout/                    # SiteHeader, SiteFooter
    landing/                   # Hero, HowItWorks, LandlordPitch, TrustStats,
                               #   PricingSection, Faq, CtaBand, SectionHeading
    ui/                        # shadcn components
  lib/
    utils.ts                   # cn()
    roles.ts                   # SignupRole type + ?role= parsing
    search-params.ts           # hero criteria -> /browse query handoff
    content/                   # pricing, faq, locations, stats, nav — all static
  routes/                      # Landing, ChooseRole, SignupDetails, Login,
                               #   Browse, StubPage
public/                        # favicons, PWA icons, site.webmanifest
scripts/generate-favicons.py   # regenerates public/ icons from the source logo
netlify.toml                   # build config + SPA fallback (see Deployment)
```

## Design tokens

Sampled from the mockup and defined once as CSS variables in `src/index.css`
(shadcn convention), so components read `bg-primary` / `text-accent` and never
hardcode a hex. Light and dark are both defined — dark mode is a token swap, not
a component rewrite.

| Token          | Value                | Use                                     |
| -------------- | -------------------- | --------------------------------------- |
| `--primary`    | deep green `#0E5A46` | logo, primary buttons, CTA band, footer |
| `--accent`     | orange `#F1592A`     | key CTAs, "Most popular" badge          |
| `--mint`       | `#E8F3EC`            | landlord band, selected role card       |
| `--peach`      | soft peach           | testimonial / accent surfaces           |
| `--surface`    | warm off-white       | cards raised over the cream ground      |
| `--background` | cream `#FBF9F5`      | page ground                             |

## Role gate

Account creation **must** go through `/signup`, which renders a role chooser —
never a form. This is a correctness requirement, not decoration.

The backend (`propertyHubBackend/src/auth/index.js`) makes `role` client-settable
but defaults an unspecified value to `TENANT`, silently coercing anything
unknown. A landlord who reached a signup form without an explicit role would be
created as a tenant with no error and could never list a property. Three
independent guards prevent that:

1. **Routing** — no path reaches a signup form without a resolved role;
   `/signup/details` redirects back to the chooser if `?role=` is missing or
   unrecognised.
2. **Types** — `SignupRole` is `'TENANT' | 'LANDLORD'` (no `ADMIN`; admins are
   provisioned separately), so downstream signup code can't omit it.
3. **UI** — the chosen role stays visible and changeable on the form; nothing is
   preselected on the visitor's behalf.

Arriving with `?role=tenant|landlord` (from the hero or a "List your property"
CTA) preselects that card but leaves it switchable. `?role=admin` or any junk
value falls back to the chooser.

## Hero search → signup handoff

`GET /properties` requires a session, so there's no anonymous browse. The hero
search therefore routes visitors into signup, carrying their criteria in a
`next` param:

```
/signup?role=tenant&next=%2Fbrowse%3Fcounty%3DKilifi%26minPrice%3D20000%26maxPrice%3D35000
```

Field values map 1:1 onto the `county` / `minPrice` / `maxPrice` params the API
already accepts (`lib/search-params.ts`), so after signup → verify → sign-in the
app can redirect to `next` and land the user on pre-filtered results. Price
brackets live in `lib/content/locations.ts`; counties are a static constant
because the backend exposes no locations endpoint.

## Backend integration notes

For when the API flows get wired up:

- **Two response shapes.** `/api/auth/*` returns Better Auth's raw JSON
  (`{token, user}`); `/api/v1/*` returns `{success, data, message, pagination?}`.
- **Auth is an opaque Bearer session token** (Redis-backed, rolling) — no JWT,
  no refresh token.
- **Signup does not sign you in.** `autoSignIn: false` and email verification is
  required: sign up → 6-digit OTP emailed → verify → sign in for a token.
- **Landlords need profile creation + admin approval** before they can list
  (`403 LANDLORD_NOT_VERIFIED`).
- Money is integer KES everywhere — no decimals.

## Deployment

Hosted on **Netlify**, deployed from `main` via `netlify.toml` — build command,
publish directory, and Node version are read from that file, so the Netlify UI
needs no manual build settings.

The one rule that matters: this is a client-routed SPA (`BrowserRouter`), so
`netlify.toml` sends every non-file path to `index.html` with a **200** (not a
301). Without it, refreshing or directly opening `/signup` or `/browse` returns
Netlify's 404 — the router never gets a chance to resolve the path. Netlify
checks for a real file first, so `/assets/*` and the favicons are unaffected.

Fingerprinted assets under `/assets/*` get a one-year immutable cache header;
`index.html` deliberately does not, so clients always fetch the current entry
point.

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for first-time setup and custom-domain
steps.
