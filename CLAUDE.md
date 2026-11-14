# org-iocoop-astro

New site for IO Coöperative, a member-owned California consumer cooperative selling at-cost VPS and
colocation in Fremont, CA. It replaces iocoop.org (WordPress plus a Django member portal). Static
Astro 7 site in plain JavaScript, styled with Tailwind 4 and daisyUI 5, MDX for rich pages, Pagefind
for search. Hosted on GitHub Pages; the forms post to the django-iocoop member portal. Follow the
global variable-naming rule: no single-letter names, including in comprehensions and loops.

## Commands

- `bun run dev` / `bun run build` / `bun run preview`. `predev` and `prebuild` run
  `bun run policies:sync` first, so running `astro` directly skips the policy sync.
- `bun run build` also runs Pagefind. Search only works in a built site
  (`bun run build && bun run preview`); the dev server has no index and the dialog says so.
- Astro 7 refuses to start a second dev or preview server while one is running (`astro dev status`,
  `astro dev stop`). Check for one before starting your own.
- `bun run clean:cache` (stale content collections), `bun run dev:fresh`, `bun run policies:update`
  (pull latest policies and regenerate), `bun run test` (see the end of this file),
  `bun run format`. A production build needs `PUBLIC_API_URL` (copy `.env.example` to `.env`).
- Prettier runs on save in PyCharm (`.idea/prettier.xml`). Markdown and MDX wrap at 100 columns
  (`proseWrap: always`). `.prettierignore` covers `vendor/`, the generated policies and `dist/`.

## Where things live

- `src/content/pages/`: marketing pages (`.md`/`.mdx`; front matter `title`, `description`,
  `eyebrow`, `cta` to show the join strip). Routed by `src/pages/[...slug].astro` with `PageLayout`.
  `services.mdx` is the hub; `services/colocation.mdx` and `services/virtual-private-servers.mdx`
  are the detail pages. `about.mdx` renders `<BoardMembers />` from `src/data/board.js`.
- `src/content/docs/`: the docs collection, routed by `src/pages/docs/[...slug].astro` with
  `DocsLayout`. `members/` is authored here (no upstream; the WordPress originals are gone).
  `policies/` is generated and gitignored (see below). The three index pages
  (`pages/docs/index.astro`, `members/index.astro`, `policies/index.astro`) are explicit Astro
  pages. Docs front matter: `title`, `description`, `group`, `order`, `updated`, `history`.
  **`order` must be unique across a whole section**, not per group, because the sidebar sorts on it.
- `src/lib/docs.js`: tree building, ordering and grouping for the docs nav.
- `src/data/`: single sources of truth. `site.js` (nav, footer, `contact` details, `pricing` with
  `available` flags), `policies.js` (policy manifest), `redirects.js` (old URL map), `board.js`,
  `api.js` (where the forms post) and `forms.js` (page-level details of each form; the fields
  themselves live in django-iocoop).
- `src/components/mdx/`: components available in every `.mdx` file without importing them
  (registered in `index.js`): `AddOns`, `BoardMembers`, `Callout`, `Faq`/`FaqItem`, `Field`/`Fields`
  (currently unused), `PricingSummary`, `RequestForm`, `ServiceCards`, `SliceTable`. Pricing
  components read `pricing` in `site.js`, so prices are never repeated in prose.
- `components/home/` holds the homepage sections; `PageHeader`, `DocsSidebar`, `DocsOutline`,
  `DocList`, `JoinCta`, `SearchButton`, `SearchDialog` and `RequestForm` (every form, including
  contact) are shared. `src/scripts/enhance-form.js` and `src/lib/render-form.js` are the browser
  code all the forms use.
- `tests/` holds the `bun test` tests (the form definitions). `.github/workflows/deploy.yml` builds
  and publishes to GitHub Pages. There is no server code in this repo: the form backend is
  django-iocoop's `iocoop/api/`.

## Decisions worth knowing

- **URLs.** Docs live at `/docs/members/...` and `/docs/policies/...`. Slugs were cleaned up when
  they moved (for example `privacy-policy` became `privacy`). Every old `/member_docs/*` and
  `/policies/*` path redirects, and `/members` redirects to `members.iocoop.org`. All of it is
  defined in `src/data/redirects.js` and built as HTML redirect pages by Astro (meta refreshes;
  GitHub Pages can't send 301s or do wildcards, so only `/members` itself is redirected to the
  portal).
- **Width.** `.container` in `global.css` is the one width and gutter wrapper (1024px at `lg`,
  1200px from `xl`). The old `wrap` utility is gone. Nav collapses to the hamburger below `lg`; the
  hero goes two-column at `lg`.
- **Brand.** Navy `#0E1A2B`, green `#22B573`; green buttons take navy text (white fails contrast).
  daisyUI themes `iocoop` (light) and `iocoop-dark` (prefers-dark) live in `global.css`. Prose
  colors are pointed at the theme tokens there, so there is no `prose-invert`.
- **Spelling.** The site brand is "IO Coöperative" (with the diaeresis) in all site copy and in the
  member docs. The policies are legal text and stay exactly as published ("IO Cooperative, Inc.").
- **Availability.** `pricing.vps.available` and `pricing.colo.available` drive the capacity pills on
  service cards and the homepage hero badge: both available is green, one is amber (`bg-amber-400`,
  because the theme's warning colour reads as red), neither is red.
- **Docs layout.** From `lg`, a sticky left sidebar lists the section's pages and nests the current
  page's `##` headings under it (`###` headings appear under the heading being read, tracked by a
  small scroll script in `DocsLayout.astro`). Below `lg`, a sticky collapsible bar holds the same
  nav. There is no separate "On this page" box. Headings have `scroll-margin-top: 5rem` for the bar.
- **Search.** A custom dialog (`SearchDialog.astro`) over the Pagefind JS API, opened from the nav,
  the docs sidebar and mobile bar, `/`, or Ctrl/Cmd+K. On docs pages it starts scoped to docs, with
  a toggle for everywhere. `BaseLayout`'s `searchSection` (`members`, `policies` or `site`) is the
  Pagefind filter; `excludeFromSearch` keeps listing pages out of the index. Pagefind's script path
  must stay in a variable in the dynamic `import()`, or Vite fails the dev server.
- **Support page.** `/support/` makes GitHub issues (`github.com/iocoop/support/issues`) the
  preferred way to ask for technical help, with the contact form as the fallback for people who
  can't use GitHub (and for asking to be added to the support repo). Billing goes through the form.
  Both fallback links preselect a Purpose (`/contact/?purpose=technical` or `billing`). The advice
  on what to include applies to either route. The page makes no promise of an auto-response or
  ticket number: that belonged to people emailing the addresses directly.
- **Forms backend.** The site has no server. Every form posts, cross-origin, to a resource in
  django-iocoop's public API (`iocoop/api/`, `/api/v1/`: `contact-messages/`, `vps-requests/`,
  `colocation-requests/`, `membership-applications/`). Django validates, **verifies the reCAPTCHA v2
  token server-side** (the widget alone proves nothing), rate limits, and emails the message with
  its own email settings. Build-time public variables (`src/data/api.js`, `.env.example`):
  `PUBLIC_API_URL` and `PUBLIC_RECAPTCHA_SITE_KEY`, both required for production builds (a build
  without them fails rather than ship forms that can't work). The portal's `CORS_ALLOWED_ORIGINS`
  must list the site's origin. The API's errors are DRF's own (`400` with `{field: [messages]}`,
  `{detail}` otherwise), which `enhance-form.js` shows beside the fields.
- **The fields are defined once, in django-iocoop.** Each form is a serializer there, and
  `GET <resource>/form/` describes it (sections, types, labels, help text, choices, limits, initial
  values, conditional fields). The browser renders that (`render-form.js`, which escapes everything
  from the API), so this repository has **no field definitions**: change a form in django-iocoop.
  `src/data/forms.js` holds only page-level details (resource, success message, the waiting-list
  flag, notes from `pricing` added after a field's help text, character counters). Contact purposes,
  the VPS `os` menu and so on are therefore Django's.
- **No published email addresses on contact flows.** Contact details come from `contact` in
  `src/data/site.js` (phone, Matrix, postal addresses; the legal entity is "IO Cooperative, Inc.",
  no diaeresis, as in the policies). **The contact page deliberately shows no email address**: the
  point is to steer people to the spam-checked form. Keep addresses out of the page, error messages,
  the no-JS notice and the repo (examples use placeholders); the support page also points at the
  form (or GitHub), never at `support@` or `billing@`. Django's tests check its responses contain
  none. The colocation and VPS pages use request forms, not `mailto:` links.
- **Request forms.** The VPS and colocation pages end with `<RequestForm kind="vps|colocation" />`
  (`kind="join"` and `kind="contact"` are the other two forms). The section anchors `#request-a-vps`
  and `#request-colocation` are targets of buttons and of old-URL redirects, so keep them. SSH keys
  are pasted, not uploaded; Django decodes each key to confirm its type and **refuses a pasted
  private key**. Routing is Django's. They don't verify membership: the email carries the member's
  address in `Reply-To` for a human to check. The VPS `os` menu (two newest Ubuntu LTS and two
  newest major Debian, plus "Other") is `VpsRequestSerializer.OS_CHOICES` in Django; refresh it
  there when a release ships (endoflife.date). Each form reads `available` from `pricing` (via
  `forms.js`); while it is `false` the form shows a waiting-list warning and sends a hidden
  `waiting_list` field, which makes Django tag the email. One flag controls the badges, the warning
  and the tag.

## Policies pipeline

The policies come from github.com/iocoop/policies, included as the `vendor/policies` git submodule
(tracking `master`) and converted by `scripts/sync-policies.js` into the gitignored
`src/content/docs/policies/`. Never edit the generated files; edit upstream.

- `src/data/policies.js` maps each upstream file to its slug, group, order and description. The sync
  fails if upstream has a file that isn't listed.
- The sync records every edit that changes wording (both tables of contents, `[TOC]`, the DMCA
  address placeholder) and verifies the output matches the source word for word apart from those. It
  converts everything before writing anything. Keep that guarantee if you change the script.
- "Last updated" dates come from the submodule's git history. The script fetches full history if the
  clone is shallow, and omits the date (with a warning) if it can't.
- Publishing a policy change: `bun run policies:update`, then commit the new `vendor/policies`
  pointer.
- The Django portal still serves these policies from the same repo, so upstream keeps its
  Python-Markdown quirks (`Title:` header, `[TOC]`, reference-style relative links) and the script
  handles them. Cleaning those up upstream is deferred.

## Gotchas

- **Whitespace.** Prettier uses its default `htmlWhitespaceSensitivity` (`css`), which treats `<a>`,
  `<span>`, `<kbd>` and the like as inline and never adds or removes a space next to them. Write
  markup naturally. When a line of text and inline elements gets too long, Prettier wraps it and
  emits `{" "}` to keep the space; that is correct, so leave it. **Never set
  `htmlWhitespaceSensitivity: "ignore"`** in `.prettierrc.mjs`: it deletes those spaces and produces
  bugs like "Allmember docs". Still scan the built HTML for words jammed against `<a>`/`<code>`
  after touching templates.
- **daisyUI menus** wrap their items in flex columns and set `nowrap` on nested links. The docs
  sidebar needs `flex-nowrap` on the menu and its `li`s and `whitespace-normal` on links, or long
  titles overflow into the article.
- **daisyUI defaults to avoid.** `.label` is 12px at 60% opacity (about 4.6:1 contrast), so set an
  explicit size and `text-base-content`. `.validator-hint` reserves its space even when hidden, so
  give it `hidden` or the rows get uneven. Class names added from JavaScript (such as `input-error`
  in `enhance-form.js`) must appear literally in the source or Tailwind won't generate their CSS.
- **`<Callout>` in an `.astro` file** needs its body wrapped in a `<p>`: its content box is a flex
  column, so bare text and links become separate rows. (In MDX the text is wrapped for you.)
- **MDX is strict**: a stray `<` or `{` in prose breaks the build. Markdown inside a JSX component
  (links, backticks) only renders when the child text sits on its own lines; text written on the
  same line as the tags comes through as plain text.
- **Browser testing.** The Playwright MCP can't launch (no Chrome installed). A Playwright Chromium
  is cached under `~/Library/Caches/ms-playwright/`; drive it with `playwright-core` and an
  `executablePath` from a scratch directory outside the repo. Test at phone, tablet and desktop
  widths and in dark mode; most layout bugs so far were only visible that way. Notes for that:
  `waitUntil: "networkidle"` never settles on pages with the reCAPTCHA widget (use `load`); Google
  may be unreachable, so stub `recaptcha/api.js` with `page.route` (or run django-iocoop locally
  with `FORMS_API_CAPTCHA_BYPASS=true`, which accepts the token `dev-bypass`); and to measure
  contrast, resolve colors through a canvas, because daisyUI uses `oklch()` and `color-mix()` values
  that a naive parser misreads.
- The shell sometimes loses `PATH` (`tr`, `python3` not found). Use absolute paths such as
  `/usr/bin/python3`.
- The repo has several commits, and its owner makes them. Don't commit unless asked.

## Open items

- **DMCA agent email.** The upstream policy hid it behind Google Mailhide, which no longer exists.
  The generated page shows `[DMCA agent email address: to be confirmed]` in two places. It needs the
  real address (a legal requirement) before launch, ideally fixed upstream.
- **Join** (`/join/`, `content/pages/join.mdx`) is `<RequestForm kind="join" />`, posting to
  Django's `membership-applications/` resource. **It offers only "Individual" and "Organization"**:
  the old form also had "Joint" with a partner's name, but the bylaws allow one class of member,
  each a natural person or an organization (sections 4.01 and 4.02; one vote per membership, 4.09
  and 6.13(a)). The only "joint" language is voting boilerplate in 6.13(b), so never add the option.
  Django creates the applicant's **inactive, passwordless** `User` and `Member` (so it is in the
  admin) and emails the approvers; a duplicate address creates nothing and is flagged in the email.
  A person still approves and sets up the member. Member Docs links to the private members-only
  GitHub wiki are plain external links.
- **Before launch**, the README has a checklist that gathers the blockers (DMCA details, the
  portal's form API deployment, the Join page and a test of real email delivery).
- **Tickets from the form.** Messages arrive from the website sender with the visitor's address in
  `Reply-To`. If the technical and billing inboxes feed a ticketing system, check that it opens
  tickets for the visitor and not for the website sender. The support page deliberately no longer
  promises an auto-response or ticket number.
- **Real reCAPTCHA and email delivery are untested.** The forms and Django's API are built and
  covered by tests and were exercised end to end against a local container, but with the captcha
  stubbed and email printed to a log. Nothing has gone through Google's widget and the portal's real
  mail settings yet.
- **The waiting list is a process, not a feature.** A full service's request form says requests join
  a waiting list and tags the email (`[...: waiting list]` subject, `WAITING LIST:` line), but
  nothing stores a list. A person has to keep one.
- **DMCA policy ZIP.** Upstream `dmca.md` gives the agent address as San Francisco 94117; the
  correct ZIP is 94115 (as on the contact page). It is legal text generated verbatim from upstream,
  so the fix belongs in the policies repo, and the designated-agent registration should match.
- **Member portal** is a separate application at `https://members.iocoop.org` (`memberPortal` in
  `src/data/site.js`) and hosts the form API (`PUBLIC_API_URL`). Only the bare `iocoop.org/members`
  URL redirects to it; GitHub Pages can't do the `/members/<path>` wildcard (follow-up).
- **Hosting** is GitHub Pages (`.github/workflows/deploy.yml`). Needs the repository's Pages source
  set to "GitHub Actions", the `PUBLIC_API_URL` and `PUBLIC_RECAPTCHA_SITE_KEY` variables, and the
  custom domain. The workflow clones the submodule with full history.
- **Source quirks kept verbatim:** the Finance Committee Charter's "Authority and Limitations" names
  the Administrative & Legal Committee, the VPS console docs mix `g0` and `g1` hosts, and the Matrix
  link is labelled "libera.chat".

## Bun and JavaScript

Plain JavaScript only: there is no TypeScript here, no `tsconfig.json`, and no type-checking step.
Don't add `.ts` files, `tsc`, `bun check` or type annotations. (Astro runs on Vite; that's
expected.)

Bun is the runtime and package manager, and `bunfig.toml` sets `run.bun = true` so Astro's bins run
on Bun, not Node.

- Use `bun install`, `bun run <script>`, `bunx <package>` and `bun <file>` instead of the npm, yarn,
  pnpm and node equivalents. Build with `astro build` through `bun run build`, not `bun build`.
- Bun loads `.env` automatically; don't add dotenv.
- Prefer `Bun.file` and `Bun.write` over `node:fs` read and write helpers, and `Bun.$` over execa
  (see `scripts/`). Directory operations (`readdir`, `rm`, `mkdir`) still use `node:fs/promises`.
- Tests live in `tests/` and run with `bun test` (`bun run test`). They check the form renderer
  (`render-form.js`: markup, conditional fields, escaping of API text). The server logic is tested
  in django-iocoop. There are no browser or visual tests; check the pages by hand (see Gotchas).
