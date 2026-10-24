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
- `bun run clean:cache` (stale content collections), `bun run dev:fresh`, `bun run policies:update`
  (pull latest policies and regenerate), `bun run format`.
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
- `src/data/`: single sources of truth. `site.js` (nav, footer, `supportEmail`, and `pricing` with
  `available` flags), `policies.js` (policy manifest), `redirects.js` (old URL map), `board.js`.
- `src/components/mdx/`: components available in every `.mdx` file without importing them
  (registered in `index.js`): `AddOns`, `BoardMembers`, `Callout`, `Faq`/`FaqItem`,
  `Field`/`Fields`, `PricingSummary`, `ServiceCards`, `SliceTable`. Pricing components read
  `pricing` in `site.js`, so prices are never repeated in prose.
- `components/home/` holds the homepage sections; `PageHeader`, `DocsSidebar`, `DocsOutline`,
  `DocList`, `JoinCta`, `SearchButton` and `SearchDialog` are shared.

## Decisions worth knowing

- **URLs.** Docs live at `/docs/members/...` and `/docs/policies/...`. Slugs were cleaned up when
  they moved (for example `privacy-policy` became `privacy`). Every old `/member_docs/*` and
  `/policies/*` path redirects via `src/data/redirects.js` (Astro writes HTML redirect stubs). If
  the host supports real 301s, generate rules from that same file.
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
- **MDX is strict**: a stray `<` or `{` in prose breaks the build. Markdown inside a JSX component
  (links, backticks) only renders when the child text sits on its own lines; text written on the
  same line as the tags comes through as plain text.
- **Browser testing.** The Playwright MCP can't launch (no Chrome installed). A Playwright Chromium
  is cached under `~/Library/Caches/ms-playwright/`; drive it with `playwright-core` and an
  `executablePath` from a scratch directory outside the repo. Test at phone, tablet and desktop
  widths and in dark mode; most layout bugs so far were only visible that way.
- The shell sometimes loses `PATH` (`tr`, `python3` not found). Use absolute paths such as
  `/usr/bin/python3`.
- Only an initial commit exists. Don't commit unless asked.

## Open items

- **DMCA agent email.** The upstream policy hid it behind Google Mailhide, which no longer exists.
  The generated page shows `[DMCA agent email address: to be confirmed]` in two places. It needs the
  real address (a legal requirement) before launch, ideally fixed upstream.
- **Not migrated yet:** Join, Contact and the member portal (`/join/`, `/contactio/`, `/members/`).
  Links to them still point at the old iocoop.org paths. Member Docs links to the private
  members-only GitHub wiki are plain external links.
- **Hosting** (probably Cloudflare Pages): confirm it clones the submodule, decide on real 301s, and
  revisit the shallow-clone date handling.
- **Source quirks kept verbatim:** the Finance Committee Charter's "Authority and Limitations" names
  the Administrative & Legal Committee, the VPS console docs mix `g0` and `g1` hosts, the VPS
  request OS list (Ubuntu 18.04 and others) is out of date, and the Matrix link is labelled
  "libera.chat".

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
- There are no tests yet. If you add some, use `bun test`.
