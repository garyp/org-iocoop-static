# org-iocoop-static

The website for [IO Coöperative](https://iocoop.org), a member-owned California consumer cooperative
that sells at-cost VPS hosting and datacenter colocation in Fremont, CA. This repo is the rebuild of
the current iocoop.org (WordPress plus a Django member portal) as a fast, static site.

It is an [Astro 7](https://astro.build) site written in plain JavaScript (no TypeScript), styled
with [Tailwind CSS 4](https://tailwindcss.com) and [daisyUI 5](https://daisyui.com), with MDX for
richer pages and [Pagefind](https://pagefind.app) for search. The output is plain static files in
`dist/`, published on GitHub Pages. The forms post to the member portal
([django-iocoop](https://github.com/iocoop/django-iocoop)), which is the site's only backend.

## Quick start

You need [Bun](https://bun.sh) (developed on 1.4) and git. `bunfig.toml` makes Astro's command-line
tools run on Bun instead of Node, and Bun is the only runtime this project is developed with.

```bash
git clone --recurse-submodules <repo-url>
cd org-iocoop-astro
bun install
bun run dev        # http://localhost:4321
```

Optional: copy `.env.example` to `.env` to say where the forms post to (see
[Contact form](#contact-form)). You don't need it to browse the site with `bun run dev`, but a
production build (`bun run build`) refuses to run without `PUBLIC_API_URL`.

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
| `bun run test`            | Runs the tests in `tests/` (the form definitions).                       |
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
  pages/              Routes: the homepage, /contact, and the catch-alls that render content
  layouts/            BaseLayout (html shell), PageLayout (marketing), DocsLayout (docs)
  components/         Nav, footer, homepage sections, search, docs sidebar, ...
    mdx/              Components you can use inside .mdx files without importing them
  data/               Single sources of truth: nav, pricing, board, policies, redirects, forms, api.js
  lib/docs.js         Builds the docs navigation tree
  scripts/            enhance-form.js: the browser behaviour shared by all the forms
  lib/render-form.js  Renders a form's fields from django-iocoop's description
  styles/global.css   Tailwind and daisyUI setup, the two themes, the .container class
scripts/              sync-policies.js
tests/                Tests for the form definitions (bun test)
.github/workflows/    deploy.yml: builds the site and publishes it to GitHub Pages
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

`/contact/` (`src/pages/contact.astro`, rendered by `src/components/RequestForm.astro`) has the same
fields as the old form: name and email (required), subject, and a message of up to 2,000 characters,
plus a required **Purpose** menu that decides where the message is sent (see below). The old "what
month falls between May and March?" quiz is replaced by a Google reCAPTCHA v2 checkbox
(`src/components/Captcha.astro`), plus a hidden honeypot field. The contact details beside the form
(phone, Matrix and the postal addresses) come from `contact` in `src/data/site.js`. **The page
deliberately publishes no email address**, so that people use the spam-checked form instead of
mailing an inbox directly. Keep it that way: error messages and the no-JavaScript notice don't
mention one either (and neither does the server).

**This site has no server of its own.** It is a static site on GitHub Pages, and every form posts to
the public form API in the member portal, [django-iocoop](https://github.com/iocoop/django-iocoop)
(`iocoop/api/` there). The portal validates the input, **verifies the reCAPTCHA token with its
secret key** (the widget alone proves nothing, since anyone can post to the API directly), rate
limits by client address, and emails the message with the portal's own email settings. The site
needs to know two things, both build-time public variables (`src/data/api.js`, `.env.example`):

| Variable                    | What it is                                                                     |
| --------------------------- | ------------------------------------------------------------------------------ |
| `PUBLIC_API_URL`            | The API root, such as `https://members.iocoop.org/api/v1`. Required.           |
| `PUBLIC_RECAPTCHA_SITE_KEY` | The public half of the portal's reCAPTCHA v2 keys (it must allow this domain). |

The browser calls the API cross-origin, so the portal's `CORS_ALLOWED_ORIGINS` must list the site's
origin. Everything else (the secret key, the inboxes, the sender address) is the portal's
configuration, and none of it is in this repository.

**Purpose and routing.** The menu offers General inquiry, Technical support, Billing support and
Legal issue. The list is the contact form's `purpose` field in django-iocoop, which also uses it to
pick the inbox, so add or rename a purpose there; this site picks it up. The email's subject is
prefixed `[Contact form: <purpose>]` and its body states the purpose. A link such as
`/contact/?purpose=billing` opens the form with that purpose selected (any menu field can be
preselected this way); the support page uses these.

To try the forms locally, run django-iocoop in a container (its README explains how), copy
`.env.example` to `.env` (it points at `http://localhost:8000/api/v1`), and use
`bun run build && bun run preview` or `bun run dev` on `http://localhost:4321`, the origin the
portal's dev settings allow. Submitted emails are printed in the container's log. Google publishes a
test key for reCAPTCHA that always passes the widget, which is what the forms use when
`PUBLIC_RECAPTCHA_SITE_KEY` is empty and the dev portal expects.

### Request forms

The VPS and colocation pages each end with a real request form, replacing the old "email us these
details" lists: `<RequestForm kind="vps" />` and `<RequestForm kind="colocation" />` in
`src/content/pages/services/`. They post to the portal's `vps-requests/` and `colocation-requests/`
resources, which work like the contact form's (honeypot, reCAPTCHA verified server-side, then
email).

**The fields are not defined in this repository.** Each form is one serializer in django-iocoop
(`iocoop/contacts/serializers.py` and `iocoop/members/serializers.py`), which validates it, lays out
the email, and describes the form at `GET <resource>/form/`: sections, field types, labels, help
text and links, choices, limits, initial values, and which fields appear only while another matches
(the VPS form asks which operating system when you pick "Other"; the colocation form asks for a
justification when you want more than one IPv4 address). The browser fetches that description and
renders the fields (`src/scripts/enhance-form.js`, `src/lib/render-form.js`), so **changing a form,
or adding one, is done in django-iocoop and needs no change or redeploy here**. A form needs this
site only for its page: `src/data/forms.js` lists what only the site knows (the API resource, the
success message, the waiting-list flag from `pricing`, notes added after a field's help text for
prices from `pricing` in `src/data/site.js`, and which text areas show a character counter). The
fields are rendered in the browser, so the forms need JavaScript (they already needed it for the
captcha), and everything from the API is escaped before it is shown.

Some behaviour worth knowing:

- **SSH keys are pasted, not uploaded**, so there is no file handling. The server checks that each
  line really is a public key (it decodes the key and confirms the type matches), and **refuses a
  pasted private key** without echoing it back.
- **Hostnames must be fully qualified**, and the colocation depth must be under 28.75 inches. Errors
  from the server appear under the field they belong to.
- **Routing.** The portal decides who receives each request (its `FORMS_API_RECIPIENTS` setting:
  `vps`, `colocation` and `join` keys, falling back to technical or general, then its default and
  its managers). The email has the member's address in `Reply-To`, and its subject is
  `[VPS request] <hostname>` or `[Colocation request] <hostname>`.
- **Availability.** While a service's `available` flag in `src/data/site.js` is `false` (the same
  flag behind the "Currently full" badges), its form shows a warning above it: the service isn't
  currently available, and a request sent now will be added to the waiting list. The warning
  disappears when you set the flag back to `true`. The requests keep working either way; while the
  service is full, the form sends a hidden `waiting_list` field and the email's subject becomes
  `[Colocation request: waiting list] <hostname>` and its body starts with a `WAITING LIST:` line,
  so the people handling it can tell.
- **The VPS operating system menu** offers the two newest Ubuntu LTS releases and the two newest
  major Debian releases (currently Ubuntu 26.04 and 24.04, Debian 13 and 12), plus "Other
  (specify)". It is the portal's `VpsRequestSerializer.OS_CHOICES`; update it there when a new
  release ships, using [endoflife.date](https://endoflife.date) for release dates and support
  windows.
- The forms don't check that the email address belongs to a member; whoever handles the request
  still does that.

All the forms share one component and one browser script. **The membership form (`/join/`) is
different from the other two**: besides emailing the people who approve new members, the portal
creates the applicant's (inactive, passwordless) account and member record, so it shows up in the
portal's admin. An application from an email address that already has an account creates nothing and
is flagged "duplicate" in the email, without telling the applicant.

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
`<SliceTable>`, `<ServiceCards>`, `<RequestForm>`, `<Callout>`, `<Faq>`/`<FaqItem>`,
`<Fields>`/`<Field>` and `<BoardMembers>` with no import. Look at
`src/content/pages/services/colocation.mdx` for examples. Two things to know: a stray `<` or `{` in
MDX prose breaks the build, and markdown inside a component (links, backticks) only renders when the
text sits on its own lines between the tags.

**Move or rename a page.** Add the old path to the `redirects` in `src/data/redirects.js` so old
links keep working.

**Update the board.** Edit `src/data/board.js`. The About page renders it.

**Change a form.** Edit its serializer in django-iocoop (see [Request forms](#request-forms)); the
site follows. Only a form's page-level details (success message, notes from pricing) are in
`src/data/forms.js`.

**Refresh the VPS operating systems.** When a new Ubuntu LTS or Debian release ships, update
`VpsRequestSerializer.OS_CHOICES` in django-iocoop (two newest of each) and drop the oldest.

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
`privacy`). The member portal moved to its own host, so any `iocoop.org/members` redirects to
`members.iocoop.org`.

Everything is defined in `src/data/redirects.js`. Astro writes an **HTML redirect page** for every
entry (a meta refresh; GitHub Pages can't send real HTTP 301s). There are no wildcards, so the bare
`/members` page is the only portal path covered: other old `iocoop.org/members/<path>` links are not
redirected yet.

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
- **daisyUI defaults.** Its `.label` is small and faint (about 4.6:1 contrast), so form labels here
  set their own size and color. `.validator-hint` keeps its space even when hidden, so use it with
  `hidden`. A class name that JavaScript adds must appear literally somewhere in the source, or
  Tailwind won't generate its CSS.
- **`<Callout>` in `.astro` files** needs its body wrapped in a `<p>`; bare text and links would
  each become their own row.
- **Testing.** `bun run test` checks the form definitions. Everything visual is checked by hand:
  build, preview, and look at the pages at phone, tablet and desktop widths, in light and dark. To
  try the forms for real, run django-iocoop locally (see [Contact form](#contact-form)).
- **daisyUI menus.** `.menu` wraps its items in flex columns, which makes long links overflow. The
  docs sidebar needs `flex-nowrap` on the menu and its `li`s and `whitespace-normal` on the links.
- **Check your work at several widths and in dark mode.** Most layout bugs here only show at phone
  or tablet width, or in the dark theme. The docs navigation changes at 1024px (sidebar on wide
  screens, sticky collapsible bar below), and the main nav collapses to a hamburger below the same
  width.
- **Search in dev.** If search says it is only available in a built site, that's expected; see
  [Search](#search).

## Deployment

The site is a fully static build (`bun run build` writes it, plus the search index, to `dist/`) and
is published to **GitHub Pages** by `.github/workflows/deploy.yml`: every push to `develop` builds
and deploys it, and pull requests run the same build without deploying. One-time setup in the
repository's settings:

- **Pages:** set the source to "GitHub Actions", and add the custom domain once it is decided (a
  `CNAME` file in `public/` is the other way to do that).
- **Custom domain first.** The site is built for `https://iocoop.org` (no base path), and the
  portal's CORS list allows that origin, so the `github.io` project URL would neither load its
  assets nor be allowed to post. Set the domain before the first deploy.
- **Actions variables:** `PUBLIC_API_URL` and `PUBLIC_RECAPTCHA_SITE_KEY` (see
  [Contact form](#contact-form)). The build fails without `PUBLIC_API_URL`, so it can't publish
  forms that post to localhost.

The workflow checks out the policies submodule with full history (the "last updated" dates come from
it), runs `bun test`, and builds with `bun run build` (not just `astro build`, which skips the
search index). The site URL (`https://iocoop.org`) is set in `astro.config.mjs` and is used for the
sitemap. The site has no server-side dependencies beyond the portal's API, which must be running and
must list the site's origin in `CORS_ALLOWED_ORIGINS`.

## Before launch

Open items that should be settled before this replaces the live site. Each is explained under
[Known gaps](#known-gaps).

- [ ] Get the real DMCA agent email address and put it in the policies repo (it's a legal
      requirement); fix the agent's ZIP code there too (94115, not 94117).
- [ ] Deploy the portal's form API, set the variables above, and send a real test message through
      each of the three forms (and check the email is actually delivered).
- [ ] Confirm the technical and billing inboxes behave with the website's sender address and the
      visitor's address in `Reply-To`, especially if they feed a ticketing system.
- [ ] Send a real test application through `/join/`, and check the account it creates in the
      portal's admin.
- [ ] Decide what to do with the other old pages (calendar, board resolutions, conference, canary
      and the news posts), and decide how the waiting list will actually be kept.
- [ ] Confirm the VPS operating systems on offer are ones you can provision.
- [ ] Decide what to do about the old `iocoop.org/members/<path>` links, which GitHub Pages can't
      redirect with a wildcard (only `/members` itself is redirected), and check that
      `members.iocoop.org` is live.

## Known gaps

- **DMCA agent email.** The upstream DMCA policy hid the agent's address behind Google Mailhide,
  which no longer exists. The generated page shows `[DMCA agent email address: to be confirmed]` in
  two places. This needs the real address (it's a legal requirement) before launch, ideally fixed in
  the policies repo.
- **Tickets from the form may need the ticketing system's help.** Messages arrive from the website's
  sender address with the visitor's address in `Reply-To`. If the technical and billing inboxes feed
  a ticketing system, check that it opens tickets for the visitor (honoring `Reply-To`) and not for
  the website sender. The support page no longer promises an auto-response or ticket number, since
  that depended on people emailing the addresses directly.
- **Real reCAPTCHA and email delivery are unverified, for all forms.** The forms and the portal's
  API are built and tested, and were exercised end to end against a local container, but with the
  captcha stood in for and email printed to a log. The first real submission through the deployed
  site (Google's widget, the portal's mail settings) hasn't happened yet.
- **The waiting list is a process, not a feature.** While a service is marked full, its request form
  says requests join the waiting list, and the email is tagged for whoever handles it, but nothing
  stores a list. Someone has to keep one (a label or filter on those emails would do).
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
  `src/data/site.js`), and it also hosts the form API this site posts to. Only the bare
  `iocoop.org/members` URL redirects to it; GitHub Pages can't do the wildcard.
- **The members-only wiki** (`github.com/iocoop/members/wiki`) is linked from the docs but not
  copied here. It is private to members.
- **Content copied as-is from the old site.** The Finance Committee Charter's "Authority and
  Limitations" section names the Administrative & Legal Committee, the VPS console docs mix `g0` and
  `g1` hostnames. These were left as written; someone who knows the facts should fix them.
