import { defineConfig, fontProviders } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"
import sitemap from "@astrojs/sitemap"
import mdx from "@astrojs/mdx"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { redirects, redirectsFile } from "./src/data/redirects.js"

// Writes dist/_redirects, the real-301 version of src/data/redirects.js.
function redirectsFileIntegration() {
  return {
    name: "redirects-file",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        await writeFile(fileURLToPath(new URL("_redirects", dir)), redirectsFile())
      },
    },
  }
}

// https://astro.build/config
export default defineConfig({
  site: "https://iocoop.org",

  redirects,

  integrations: [icon(), mdx(), sitemap(), redirectsFileIntegration()],

  fonts: [
    {
      name: "Space Grotesk",
      cssVariable: "--font-space-grotesk",
      provider: fontProviders.fontsource(),
      weights: ["300 700"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      name: "IBM Plex Mono",
      cssVariable: "--font-ibm-plex-mono",
      provider: fontProviders.fontsource(),
      weights: ["400", "500"],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["monospace"],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },
})
