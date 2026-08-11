# Deploying NyumbaLink to Netlify

The app is a static Vite build (`dist/`) with client-side routing. Everything
Netlify needs to build it lives in [`netlify.toml`](./netlify.toml), so there is
nothing to type into the build-settings form.

Repo: `Decipher-Org/Nyumbalink` · production branch: `main`

---

## 1. First-time setup

Deploying from Git is the right default here: every push to `main` publishes,
and every pull request gets its own preview URL.

1. Sign in at [app.netlify.com](https://app.netlify.com) — use the **GitHub**
   option so Netlify can see the repo.
2. **Add new site → Import an existing project → GitHub**.
3. Authorise Netlify. `Decipher-Org` is an organisation, so if the repo doesn't
   appear you need an org owner to grant access (**Configure the Netlify app** →
   pick the org → allow all repos or select `Nyumbalink`).
4. Choose **`Decipher-Org/Nyumbalink`**.
5. The build settings will already be filled in from `netlify.toml`:

   | Field | Value | Source |
   |---|---|---|
   | Branch to deploy | `main` | |
   | Build command | `npm run build` | `netlify.toml` |
   | Publish directory | `dist` | `netlify.toml` |
   | Node version | 22 | `netlify.toml` |

   Leave them as they are — editing them in the UI creates an override that
   silently wins over the committed file later.
6. **Deploy**. The first build takes 1–2 minutes and lands on a generated URL
   like `random-name-123456.netlify.app`.

No environment variables are needed yet: nothing on the landing page calls the
backend. That changes when the API gets wired up (see [Later](#later-when-the-api-is-wired-up)).

## 2. Check the deploy

Once it's live, confirm the SPA fallback survived — this is the one thing that
distinguishes a working deploy from a broken one:

- Open the site root. The landing page should render with the logo in the tab.
- Navigate to **Find a home**, then **reload the page**. It must stay on the
  role chooser, not show a 404.
- Open `https://<your-site>/browse` **directly in a new tab**. Same — it should
  load, not 404.

If those 404, the publish directory or the redirect rule didn't take effect —
check **Site configuration → Build & deploy** for a UI override shadowing
`netlify.toml`.

---

## 3. Connecting your domain

You need access to wherever the domain's DNS is managed (the registrar you
bought it from — Namecheap, GoDaddy, Truehost, Safaricom, Cloudflare, etc.).

In Netlify: **Domain management → Add a domain** → type the domain → **Verify**
→ **Add domain**.

Netlify then offers two routes. They differ in *who answers DNS queries for your
domain*, which is the decision worth making deliberately:

### Option A — Netlify DNS (simplest)

Netlify becomes your authoritative nameserver and manages every record.

1. Netlify shows four nameservers, e.g. `dns1.p03.nsone.net` …
2. At your registrar, replace the existing nameservers with those four.
3. Wait for propagation — usually under an hour, occasionally up to 24.

**Good when** the domain only serves this site. **Think twice if** the domain
already has email (MX), a backend subdomain, or other live records — switching
nameservers moves *all* of them, and anything you forget to recreate in Netlify
breaks. Email outages from a forgotten MX record are the classic version of this
mistake.

### Option B — External DNS (keep your current provider)

You keep your nameservers and add two records:

| Type | Name | Value |
|---|---|---|
| `A` (or `ALIAS`/`ANAME`) | `@` (apex, e.g. `nyumbalink.co.ke`) | `75.2.60.5` |
| `CNAME` | `www` | `<your-site>.netlify.app` |

Netlify displays the exact values for your site — **use the ones it shows you**,
not the example above, since the apex IP can differ by account and region.

A caveat worth knowing: the DNS spec doesn't allow `CNAME` on the apex, which is
why the apex uses an `A` record. If your provider supports `ALIAS`, `ANAME`, or
Cloudflare's CNAME flattening, prefer that — it keeps working if Netlify ever
changes the IP.

### Then, either way

- Pick a **primary domain** (`www.` vs apex). Netlify 301-redirects the other to
  it, so you don't split SEO across both.
- **HTTPS** — Netlify provisions a free Let's Encrypt certificate automatically
  once DNS resolves. It can take a few minutes to an hour, and the certificate
  cannot be issued until the records point at Netlify. If it stalls, use
  **Domain management → HTTPS → Renew certificate** after confirming DNS.
- Verify with `dig nyumbalink.co.ke +short` and `dig www.nyumbalink.co.ke
  +short` — they should return the Netlify IP / hostname.

Until DNS finishes propagating you may see a certificate warning. That's
expected mid-propagation; it resolves itself once the records are live
everywhere.

---

## Later, when the API is wired up

Two things will need attention on the first deploy that talks to the backend:

- **`VITE_API_URL`** (or whatever the client reads) set under **Site
  configuration → Environment variables**. Vite inlines `VITE_*` values at
  **build** time, so changing one requires a redeploy — it is not read at
  runtime. Anything in a `VITE_*` variable ships to the browser in plain text;
  never put a secret there.
- **CORS on the backend** must allow the deployed origin. Note that Netlify
  gives every PR its own preview URL, so either allow the `*.netlify.app`
  preview pattern or accept that previews can't reach the API.

Deploy previews are worth keeping on — each pull request gets a shareable URL
built exactly like production.
