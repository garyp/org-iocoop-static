import { defineConfig, fontProviders } from "astro/config"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-icon"
import sitemap from "@astrojs/sitemap"

// https://astro.build/config
export default defineConfig({
  site: "https://iocoop.org",

  integrations: [icon(), sitemap()],

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
