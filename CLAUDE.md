# org-iocoop-astro

New site for IO Coöperative, a member-owned California consumer cooperative selling at-cost VPS and
colocation in Fremont, CA. It replaces iocoop.org (WordPress plus a Django member portal). Static
Astro 7 site in plain JavaScript, styled with Tailwind 4 and daisyUI 5, MDX for rich pages, Pagefind
for search. Hosting is undecided (probably Cloudflare Pages). Follow the global variable-naming
rule: no single-letter names, including in comprehensions and loops.

## Commands

- `bun run dev` / `bun run build` / `bun run preview`. `predev` and `prebuild` run
  `bun run policies:sync` first, so running `astro` directly skips the policy sync.
- `bun run build` also runs Pagefind. Search only works in a built site
  (`bun run build && bun run preview`); the dev server has no index and the dialog says so.
- Astro 7 refuses to start a second dev or preview server while one is running (`astro dev status`,
  `astro dev stop`). Check for one before starting your own.
- `bun run clean:cache` (stale content collections), `bun run dev:fresh`, `bun run cf:preview`
  (builds, then serves `dist/` with wrangler: real `_redirects` and the form functions; `cf:deploy`
  uploads a build by hand and needs `CF_PAGES_PROJECT`), `bun run policies:update` (pull latest
  policies and regenerate), `bun run test` (see the end of this file), `bun run format`.
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
  `contact-purposes.js` (the contact form's Purpose menu) and `request-forms.js` (the VPS and
  colocation request forms).
- `src/components/mdx/`: components available in every `.mdx` file without importing them
  (registered in `index.js`): `AddOns`, `BoardMembers`, `Callout`, `Faq`/`FaqItem`, `Field`/`Fields`
  (currently unused), `PricingSummary`, `RequestForm`, `ServiceCards`, `SliceTable`. Pricing
  components read `pricing` in `site.js`, so prices are never repeated in prose.
- `components/home/` holds the homepage sections; `PageHeader`, `DocsSidebar`, `DocsOutline`,
  `DocList`, `JoinCta`, `SearchButton`, `SearchDialog`, `ContactForm` and `RequestForm` are shared.
  `src/scripts/enhance-form.js` is the one browser script all three forms use.
- `functions/` is the server side of the three forms: Cloudflare Pages Functions
  (`functions/api/contact.js`, `request-vps.js`, `request-colocation.js`), each a one-liner over the
  shared pipeline in `functions/_lib/` (`form-handler.js`; `compose.js` builds the email,
  `deliver.js` sends it). It is not part of the Astro build and only runs on Cloudflare (or
  `wrangler pages dev`). `tests/` holds its `bun test` tests. Keep tests out of `functions/`, since
  Pages treats that folder as routes.

## Decisions worth knowing

- **URLs.** Docs live at `/docs/members/...` and `/docs/policies/...`. Slugs were cleaned up when
  they moved (for example `privacy-policy` became `privacy`). Every old `/member_docs/*` and
  `/policies/*` path redirects, and `/members/<path>` redirects to `members.iocoop.org/<path>`. All
  of it is defined in `src/data/redirects.js` and built two ways: HTML redirect pages from Astro
  (any host; no wildcards) and `dist/_redirects` (real 301s for Cloudflare Pages and Netlify;
  written by a small integration in `astro.config.mjs`, and the only home of the `/members/*`
  wildcard). `astro preview` ignores `_redirects`, so check that file's contents, not the preview.
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
- **Contact form.** `/contact/` (`pages/contact.astro` plus `ContactForm.astro`) posts to
  `/api/contact`. The function checks a honeypot field, validates, **verifies the Turnstile token
  server-side** (the widget alone proves nothing), then emails the message through Amazon SES
  (`functions/_lib/ses.js`, called by `deliver.js`; Cloudflare can't send email, so there is no
  binding to use). Config: `PUBLIC_TURNSTILE_SITE_KEY` is a build-time public variable (falls back
  to Cloudflare's always-pass test key with a build warning); `TURNSTILE_SECRET_KEY`,
  `CONTACT_FROM`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (optionally
  `SES_CONFIGURATION_SET`) and the inboxes below are Pages secrets. See `.env.example`,
  `.dev.vars.example` and the README.
- **Contact routing.** The form's required **Purpose** menu (General inquiry, Technical support,
  Billing support, Legal issue) decides the recipient. The list is in
  `src/data/contact-purposes.js`, read by both the form and the server (which rejects unknown
  values). Each purpose names an env var for its inbox (`CONTACT_TO_GENERAL`,
  `CONTACT_TO_TECHNICAL`, `CONTACT_TO_BILLING`, `CONTACT_TO_LEGAL`); a purpose without one falls
  back to `CONTACT_TO`, and with neither the request gets a 503 before Turnstile is called. The
  email subject is `[Contact form: <purpose>]`. `/contact/?purpose=<value>` preselects a purpose;
  the support page links use it. Add or rename a purpose only in `contact-purposes.js`.
- **No published email addresses on contact flows.** Contact details come from `contact` in
  `src/data/site.js` (phone, Matrix, postal addresses; the legal entity is "IO Cooperative, Inc.",
  no diaeresis, as in the policies). **The contact page deliberately shows no email address**: the
  point is to steer people to the spam-checked form. Keep addresses out of the page, error messages,
  the no-JS notice and the repo (examples use placeholders); the support page also points at the
  form (or GitHub), never at `support@` or `billing@`. `tests/contact.test.js` checks that failure
  responses contain no `@`. The colocation and VPS pages use request forms, not `mailto:` links.
- **Request forms.** The VPS and colocation pages end with `<RequestForm kind="vps|colocation" />`.
  **Each form's fields are defined once, in `src/data/request-forms.js`**; `RequestForm.astro`
  renders them and `functions/_lib/validate-request.js` validates them, so change a form only there
  (types, limits, options, help text, `showWhen` conditional fields, cross-field `checks`). The
  section anchors `#request-a-vps` and `#request-colocation` are targets of buttons and of old-URL
  redirects, so keep them. SSH keys are pasted, not uploaded; the server decodes each key to confirm
  its type and **refuses a pasted private key**. Requests route to `REQUEST_TO_VPS` /
  `REQUEST_TO_COLOCATION`, then `CONTACT_TO_TECHNICAL`, then `CONTACT_TO`. They don't verify
  membership: the email carries the member's address in `Reply-To` for a human to check. The VPS
  `os` menu is the two newest Ubuntu LTS and two newest major Debian releases (plus "Other");
  refresh it when a release ships (endoflife.date), and keep retired releases out. Each form reads
  `available` from `pricing` (via `request-forms.js`); while it is `false` the form shows a
  waiting-list warning above it and the email is tagged as a waiting-list request. One flag controls
  the badges, the warning and the tag.

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
  `waitUntil: "networkidle"` never settles on pages with the Turnstile widget (use `load`); Pages
  Functions don't run in dev or preview, so mock `/api/*` with `page.route`; and to measure
  contrast, resolve colors through a canvas, because daisyUI uses `oklch()` and `color-mix()` values
  that a naive parser misreads.
- The shell sometimes loses `PATH` (`tr`, `python3` not found). Use absolute paths such as
  `/usr/bin/python3`.
- The repo has several commits, and its owner makes them. Don't commit unless asked.

## Open items

- **DMCA agent email.** The upstream policy hid it behind Google Mailhide, which no longer exists.
  The generated page shows `[DMCA agent email address: to be confirmed]` in two places. It needs the
  real address (a legal requirement) before launch, ideally fixed upstream.
- **Join** (`/join/`, `content/pages/join.mdx`) is a third entry in `request-forms.js`
  (`<RequestForm kind="join" />`, posting to `functions/api/join.js`, routed to `JOIN_TO`, then
  `CONTACT_TO_GENERAL`, then `CONTACT_TO`). **It offers only "Individual" and "Organization"**: the
  old form also had "Joint" with a partner's name, but the bylaws allow one class of member, each a
  natural person or an organization (sections 4.01 and 4.02; one vote per membership, 4.09 and
  6.13(a)). The only "joint" language is voting boilerplate in 6.13(b), so never add the option.
  Nothing creates the member record: a person reads the email. Member Docs links to the private
  members-only GitHub wiki are plain external links.
- **Before launch**, the README has a checklist that gathers the blockers (DMCA details, the
  Cloudflare configuration, the Join page and a test of real email delivery).
- **Tickets from the form.** Messages arrive from the website sender with the visitor's address in
  `Reply-To`. If the technical and billing inboxes feed a ticketing system, check that it opens
  tickets for the visitor and not for the website sender. The support page deliberately no longer
  promises an auto-response or ticket number.
- **Email delivery is untested, for all forms.** Everything up to the send is built and covered by
  tests, and the SES request signing is checked against an independent SigV4 computation, but
  nothing has been sent through a real SES account yet (verified identity, production access out of
  the sandbox, an IAM user limited to `ses:SendEmail`).
- **The waiting list is a process, not a feature.** A full service's request form says requests join
  a waiting list and tags the email (`[...: waiting list]` subject, `WAITING LIST:` line), but
  nothing stores a list. A person has to keep one.
- **DMCA policy ZIP.** Upstream `dmca.md` gives the agent address as San Francisco 94117; the
  correct ZIP is 94115 (as on the contact page). It is legal text generated verbatim from upstream,
  so the fix belongs in the policies repo, and the designated-agent registration should match.
- **Member portal** is a separate application at `https://members.iocoop.org` (`memberPortal` in
  `src/data/site.js`). Old `iocoop.org/members/<path>` URLs redirect to it via `dist/_redirects`.
- **Hosting** (probably Cloudflare Pages): confirm it clones the submodule and applies
  `dist/_redirects`, and revisit the shallow-clone date handling.
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
- Tests live in `tests/` and run with `bun test` (`bun run test`). They cover the forms' server
  logic: validation, routing, the SSH key and private-key checks, composing and building the email,
  Turnstile handling and the waiting-list tag. There are no browser or visual tests; check the pages
  by hand (see Gotchas).
