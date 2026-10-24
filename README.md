# org-iocoop-astro

The website for [IO Coöperative](https://iocoop.org), a member-owned California consumer cooperative
that sells at-cost VPS hosting and datacenter colocation in Fremont, CA. This repo is the rebuild of
the current iocoop.org (WordPress plus a Django member portal) as a fast, static site.

It is an [Astro 7](https://astro.build) site written in plain JavaScript (no TypeScript), styled
with [Tailwind CSS 4](https://tailwindcss.com) and [daisyUI 5](https://daisyui.com), with MDX for
richer pages and [Pagefind](https://pagefind.app) for search. The output is plain static files in
`dist/`.

## Quick start

You need [Bun](https://bun.sh) (developed on 1.4) and git. `bunfig.toml` makes Astro's command-line
tools run on Bun instead of Node, and Bun is the only runtime this project is developed with.

```bash
git clone --recurse-submodules <repo-url>
cd org-iocoop-astro
bun install
bun run dev        # http://localhost:4321
```

If you cloned without `--recurse-submodules`, run `git submodule update --init` once. The policies
are pulled from a submodule (see [Policies](#policies)), and the dev server will stop with a clear
message if it is missing.

Before you push anything, make sure the production build still works:

```bash
bun run build      # static site plus search index in dist/
bun run preview    # serve dist/ locally, with working search
```

## Commands

| Command                   | What it does                                                             |
| ------------------------- | ------------------------------------------------------------------------ |
| `bun run dev`             | Dev server with hot reload. Search does not work here (see below).       |
| `bun run build`           | Builds the site into `dist/` and then builds the search index.           |
| `bun run preview`         | Serves the last build from `dist/`.                                      |
| `bun run policies:sync`   | Regenerates the policy pages from the submodule (dev and build do this). |
| `bun run policies:update` | Pulls the latest policies from upstream, then regenerates them.          |
| `bun run clean:cache`     | Deletes Astro and Vite caches. Try this if content looks stale.          |
| `bun run clean`           | `clean:cache` plus deleting `dist/`.                                     |
| `bun run dev:fresh`       | `clean:cache`, `policies:sync`, then the dev server.                     |
| `bun run test`            | Runs the tests in `tests/` (the contact form's server logic).            |
| `bun run format`          | Runs Prettier over the whole repo.                                       |

Astro 7 will not start a second dev or preview server while one is already running. If a command
exits immediately saying a server is already running, stop the old one (`astro dev stop`) or use the
URL it printed.

## How the site is organized

```text
src/
  content/
    pages/            Marketing pages (.md / .mdx): about, services, support
    docs/
      members/        Member documentation, written here
      policies/       GENERATED from the policies submodule, gitignored. Do not edit.
  pages/              Routes: homepage, and the two catch-all routes that render content
  layouts/            BaseLayout (html shell), PageLayout (marketing), DocsLayout (docs)
  components/         Nav, footer, homepage sections, search, docs sidebar, ...
    mdx/              Components you can use inside .mdx files without importing them
  data/               Single sources of truth: nav, pricing, board, policies, redirects
  lib/docs.js         Builds the docs navigation tree
  styles/global.css   Tailwind and daisyUI setup, the two themes, the .container class
scripts/              sync-policies.js
functions/            Cloudflare Pages Functions: the contact form's server side
tests/                Tests for the contact form logic (bun test)
vendor/policies/      Git submodule: github.com/iocoop/policies
public/               Logos and other files served as-is
```

### Pages and docs

There are two content collections, defined in `src/content.config.js`.

- **Pages** (`src/content/pages/`) are rendered by `src/pages/[...slug].astro` with `PageLayout`: a
  header band, then the content. The file path is the URL (`services/colocation.mdx` is
  `/services/colocation/`). Front matter: `title`, `description`, `eyebrow` (the small label above
  the title), and `cta: true` to show the "Want a seat at the table?" join strip at the bottom.
- **Docs** (`src/content/docs/`) are rendered by `src/pages/docs/[...slug].astro` with `DocsLayout`:
  a sticky sidebar, breadcrumbs, previous and next links. The path is the URL, under `/docs/`. The
  three listing pages (`/docs/`, `/docs/members/`, `/docs/policies/`) are ordinary Astro pages in
  `src/pages/docs/`.

The page title comes from the front matter and is rendered as the `h1`, so start your content with
`##` headings.

### Data files

Anything that appears in more than one place lives in `src/data/`, so you change it once.

- `site.js`: top navigation, footer links, the support email, and `pricing` (prices, feature lists,
  add-ons, and the `available` flags described below).
- `policies.js`: maps each upstream policy file to its slug, group, order and description.
- `redirects.js`: old iocoop.org URLs mapped to their new homes.
- `board.js`: the people listed on the About page.

### Styling

Tailwind 4 has no config file; everything is in `src/styles/global.css`. That file defines the two
daisyUI themes (`iocoop` for light, `iocoop-dark` for dark, chosen by the visitor's system setting),
the brand colors (navy `#0E1A2B`, green `#22B573`), and the `.container` class, which is the one
wrapper that sets page width and side gutters. Use it for any full-width section. Body text is
styled by Tailwind's typography plugin (`prose`), pointed at the theme colors in the same file.
Icons come from the Material Design Icons set: `<Icon name="mdi:check" />`.

### Search

Search is a dialog (`SearchDialog.astro`) over a Pagefind index. Open it from the nav icon, the docs
sidebar, the sticky bar on phones, or by pressing `/` or Ctrl/⌘+K. On docs pages it starts scoped to
docs, with a toggle to search the whole site.

The index is written by `bun run build`, so **search only works in a built site**: use
`bun run build && bun run preview`, not `bun run dev`. Each page tags itself with a section for the
scope filter through `searchSection` on `BaseLayout`. Listing pages opt out of the index with
`excludeFromSearch`. Searching the bylaws returns the individual sections that match, because
Pagefind indexes headings.

### Contact form

`/contact/` (`src/pages/contact.astro`, `src/components/ContactForm.astro`) has the same fields as
the old form: name and email (required), subject, and a message of up to 2,000 characters, plus a
required **Purpose** menu that decides where the message is sent (see below). The old "what month
falls between May and March?" quiz is replaced by
[Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/), plus a hidden honeypot field.
The contact details beside the form (phone, Matrix and the postal addresses) come from `contact` in
`src/data/site.js`. **The page deliberately publishes no email address**, so that people use the
spam-checked form instead of mailing an inbox directly. Keep it that way: error messages and the
no-JavaScript notice don't mention one either, and a test enforces it for the server's responses.

The form posts to `/api/contact`, a
[Cloudflare Pages Function](https://developers.cloudflare.com/pages/functions/) in
`functions/api/contact.js`. It validates the input, **verifies the Turnstile token with the secret
key** (the widget alone proves nothing, since anyone can post to the endpoint directly), and emails
the message. The logic is in `functions/_lib/` and is covered by `bun test`.

**Purpose and routing.** The menu offers General inquiry, Technical support, Billing support and
Legal issue. The list lives in `src/data/contact-purposes.js`, which both the form and the server
read, so they can't drift apart; the server rejects any purpose not in it. Each purpose names an
environment variable that holds its inbox, and a purpose with no variable of its own goes to
`CONTACT_TO`:

| Purpose           | Inbox variable         |
| ----------------- | ---------------------- |
| General inquiry   | `CONTACT_TO_GENERAL`   |
| Technical support | `CONTACT_TO_TECHNICAL` |
| Billing support   | `CONTACT_TO_BILLING`   |
| Legal issue       | `CONTACT_TO_LEGAL`     |

The addresses are Cloudflare secrets, never in the repo, so you can reroute without a code change.
To add or rename a purpose, edit `contact-purposes.js`. The email's subject is prefixed
`[Contact form: <purpose>]` and its body states the purpose. A link such as
`/contact/?purpose=billing` opens the form with that purpose selected; the support page uses these.

Setting it up on Cloudflare Pages:

1. **Turnstile.** In the Cloudflare dashboard, add a Turnstile widget for `iocoop.org`. The widget
   gives you a site key and a secret key.
2. **Build variable** `PUBLIC_TURNSTILE_SITE_KEY`: the site key. It is baked into the page at build
   time, so it must be set for builds. Without it the build warns and uses Cloudflare's test key.
3. **Secrets and variables** on the Pages project: `TURNSTILE_SECRET_KEY` (the secret key),
   `CONTACT_FROM` (the sender, such as `website@iocoop.org`), and the inboxes: `CONTACT_TO` as the
   catch-all, plus any of the per-purpose variables in the table above. Inboxes are never shown on
   the site. A message whose purpose has no inbox at all is refused with a "try again later"
   message, so set at least `CONTACT_TO`.
4. **Email.** `functions/_lib/deliver.js` sends through a Cloudflare Email Routing `send_email`
   binding named `EMAIL`. That needs Email Routing enabled on the domain, every inbox you use set up
   as a verified destination address, and the binding added to the Pages project. If you would
   rather use another email provider, replace `deliver` in that file; nothing else depends on how it
   sends.

To try it locally: `bun test` checks the server logic with no network. `bun run dev` renders the
page, but Pages Functions don't run there, so submitting returns a 404. To exercise the whole path,
copy `.dev.vars.example` to `.dev.vars`, run `bun run build`, and then
`bunx wrangler pages dev dist`. Cloudflare publishes test keys for Turnstile: the site key in
`.env.example`'s fallback and the secret in `.dev.vars.example` always pass, and the `2x...`
variants always fail.

## Common tasks

**Change prices or capacity.** Edit `pricing` in `src/data/site.js`. Set `available: false` on VPS
or colocation when you are full. The homepage badge turns amber when one service is full and red
when both are, the service cards show "Currently full", and the service pages follow.

**Add or edit a member doc.** Create `src/content/docs/members/<name>.md`:

```markdown
---
title: "Your page title"
description: "One line shown on the listing page."
group: "Your servers"
order: 7
updated: 2026-01-15
---

## First section

Text. Link to other docs with absolute paths like `/docs/members/billing/`.
```

`group` is the heading it appears under on `/docs/members/`. `order` sorts the sidebar and **must be
unique across the whole section**, not just within its group. A doc inside a folder nests under the
doc with the folder's name (`committees/finance.md` appears under `committees.md`). Add images to
`public/images/` and reference them as `/images/...`.

**Add a marketing page.** Create `src/content/pages/<name>.md` (or `.mdx`) with `title` and
`description`, then add a link in `navLinks` in `src/data/site.js` if it belongs in the menu.

**Use the MDX components.** In `.mdx` files you can use `<PricingSummary>`, `<AddOns>`,
`<SliceTable>`, `<ServiceCards>`, `<Callout>`, `<Faq>`/`<FaqItem>`, `<Fields>`/`<Field>` and
`<BoardMembers>` with no import. Look at `src/content/pages/services/colocation.mdx` for examples.
Two things to know: a stray `<` or `{` in MDX prose breaks the build, and markdown inside a
component (links, backticks) only renders when the text sits on its own lines between the tags.

**Move or rename a page.** Add the old path to the `redirects` in `src/data/redirects.js` so old
links keep working.

**Update the board.** Edit `src/data/board.js`. The About page renders it.

## Policies

The policies under `/docs/policies/` are not written here. They live in
[iocoop/policies](https://github.com/iocoop/policies), which is included as the `vendor/policies`
git submodule tracking `master`. `scripts/sync-policies.js` converts them into
`src/content/docs/policies/` every time you run dev or build. That folder is gitignored; **edit the
policies upstream, never the generated files.**

To publish a policy change:

```bash
bun run policies:update      # pulls the latest upstream and regenerates the pages
git add vendor/policies      # the new submodule pointer
git commit                   # that commit is what publishes the change
```

How the conversion works, and why it is safe:

- The upstream files use Python-Markdown conventions (a `Title:` header, `[TOC]`, reference-style
  relative links), because the Django member portal also renders them. The script reshapes them for
  this site and rewrites links between policies to their new addresses.
- It records every edit that changes wording (the two tables of contents, the `[TOC]` marker, and a
  placeholder for the DMCA agent's email) and then checks that the output matches the source word
  for word apart from those edits. If it ever doesn't, the build fails and says where. Nothing is
  written until every policy passes.
- `src/data/policies.js` is the manifest. If upstream adds a policy that isn't listed there, the
  build fails until you add an entry (slug, group, order, description).
- "Last updated" dates come from the submodule's git history. If the clone is shallow (some hosts do
  this) the script fetches the full history first, and leaves the date off with a warning if it
  can't.
- The policies are legal text, so unlike the rest of the site they keep the spelling "IO
  Cooperative, Inc." exactly as published, without the diaeresis.

## URLs and redirects

Docs live at `/docs/members/...` and `/docs/policies/...`. The old locations (`/member_docs/...` and
`/policies/...`) redirect to them, and slugs were shortened on the way (`privacy-policy` became
`privacy`). The member portal moved to its own host, so any `iocoop.org/members/<path>` redirects to
`members.iocoop.org/<path>`.

Everything is defined in `src/data/redirects.js`, and each build produces it two ways:

- **HTML redirect pages**, written by Astro for every entry. They work on any host, but can't do
  wildcards, so the bare `/members` page is the only portal path covered this way.
- **`dist/_redirects`**, real HTTP 301s that
  [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/redirects/) and Netlify
  apply automatically. This is the only place the `/members/*` wildcard exists. On a host that
  doesn't read `_redirects`, translate that file into its own rules.

To add a redirect, add it to `src/data/redirects.js`; to change where the portal lives, change
`memberPortal` in `src/data/site.js`, which feeds both the nav links and these rules.

## Working on the code

- **Formatting.** Prettier is configured in `.prettierrc.mjs`; run `bun run format`, or enable
  Prettier on save in your editor. Markdown and MDX are wrapped at 100 columns, and `.editorconfig`
  carries the same setting for editors that read it. `vendor/`, `dist/` and the generated policies
  are excluded.
- **No TypeScript.** Everything is plain JavaScript. Don't add type annotations or a `tsconfig`.
- **Naming.** Use descriptive names, even in loops and comprehensions:
  `for (const policy of policies)`, not `for (const p of policies)`.
- **Whitespace in `.astro` templates.** Prettier keeps the spaces next to inline elements (links,
  `<kbd>`, `<strong>`) as you wrote them, so just write markup naturally. When a line of text and
  inline elements is too long, Prettier wraps it and inserts `{" "}` to preserve the space. That's
  expected; leave it in. Don't set `htmlWhitespaceSensitivity: "ignore"` in `.prettierrc.mjs`, which
  strips those spaces and gives you text like "Allmember docs".
- **daisyUI menus.** `.menu` wraps its items in flex columns, which makes long links overflow. The
  docs sidebar needs `flex-nowrap` on the menu and its `li`s and `whitespace-normal` on the links.
- **Check your work at several widths and in dark mode.** Most layout bugs here only show at phone
  or tablet width, or in the dark theme. The docs navigation changes at 1024px (sidebar on wide
  screens, sticky collapsible bar below), and the main nav collapses to a hamburger below the same
  width.
- **Search in dev.** If search says it is only available in a built site, that's expected; see
  [Search](#search).

## Deployment

`bun run build` produces a fully static site in `dist/`, including the search index in
`dist/pagefind/`. Any static host works. Where it will be hosted is not decided yet (Cloudflare
Pages is the likely choice). Whatever you pick needs to:

- clone git submodules when it checks out the repo (the policies come from one),
- run `bun run build` (not just `astro build`, which skips the search index), and
- apply `dist/_redirects` (Cloudflare Pages and Netlify do this on their own), which is how the
  `/members/*` portal redirect works (see above).

The site URL (`https://iocoop.org`) is set in `astro.config.mjs` and is used for the sitemap.

## Known gaps

- **DMCA agent email.** The upstream DMCA policy hid the agent's address behind Google Mailhide,
  which no longer exists. The generated page shows `[DMCA agent email address: to be confirmed]` in
  two places. This needs the real address (it's a legal requirement) before launch, ideally fixed in
  the policies repo.
- **Pages not migrated yet:** Join. Links to `/join/` still point at the old iocoop.org path and 404
  on this site.
- **Tickets from the form may need the ticketing system's help.** Messages arrive from the website's
  sender address with the visitor's address in `Reply-To`. If the technical and billing inboxes feed
  a ticketing system, check that it opens tickets for the visitor (honoring `Reply-To`) and not for
  the website sender. The support page no longer promises an auto-response or ticket number, since
  that depended on people emailing the addresses directly.
- **Contact form delivery is unverified.** The form, the Turnstile check and the server logic are
  built and tested, but sending the email through the `EMAIL` binding has not been run on
  Cloudflare, and it isn't confirmed that Pages Functions support the `send_email` binding. If they
  don't, swap in another provider in `functions/_lib/deliver.js`. Nothing is delivered until
  `TURNSTILE_SECRET_KEY`, `CONTACT_TO`, `CONTACT_FROM` and the binding are configured.
- **The DMCA policy has the wrong ZIP code.** The DMCA agent's mailing address in the policies repo
  (`dmca.md`) says San Francisco 94117; the correct ZIP is 94115, as on the contact page. This is
  legal text that is generated word for word from upstream, so it has to be fixed in the policies
  repo, and the designated-agent registration should match.
- **Other pages on the old site that may be worth migrating.** These exist on the live iocoop.org
  and have no counterpart here yet, so they 404. Decide for each whether to migrate it (at the same
  URL, so no redirect is needed) or retire it:
  - `/calendar/`
  - `/board-resolutions/`
  - `/conference-information/`
  - `/canary/`
  - `/news/`, the news index, and its five posts: `/news/2022-repricing/`,
    `/news/as-of-february-2020-yes-we-are-still-alive/`,
    `/news/notice-of-2015-annual-meeting-of-members/`,
    `/news/notice-of-2014-annual-meeting-of-members/` and
    `/news/notice-of-2013-annual-meeting-of-members/`
- **Member portal.** It is a separate application at `https://members.iocoop.org` (`memberPortal` in
  `src/data/site.js`). Old `iocoop.org/members/<path>` URLs redirect to it through
  `dist/_redirects`.
- **The members-only wiki** (`github.com/iocoop/members/wiki`) is linked from the docs but not
  copied here. It is private to members.
- **Content copied as-is from the old site.** The Finance Committee Charter's "Authority and
  Limitations" section names the Administrative & Legal Committee, the VPS console docs mix `g0` and
  `g1` hostnames, and the operating systems listed on the VPS request page (Ubuntu 18.04 and others)
  are out of date. These were left as written; someone who knows the facts should fix them.
