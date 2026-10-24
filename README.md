# org-iocoop-astro

Static Astro 7 site (plain JavaScript) styled with Tailwind 4 + daisyUI 5.
Markdown in `src/content/pages/` is rendered through `src/pages/[...slug].astro`.

```bash
bun install
bun run dev      # dev server
bun run build    # static output in dist/
bun run preview
```

Runs on Bun; `bunfig.toml` sets `run.bun = true` so Astro's bins use Bun's runtime, not Node.
