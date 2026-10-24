import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

const pages = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    eyebrow: z.string().optional(),
    cta: z.boolean().default(false),
  }),
})

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Section index pages list docs under their group heading, ordered by `order` then title.
    group: z.string().optional(),
    order: z.number().default(100),
    updated: z.coerce.date().optional(),
    // Link to the source and revision history, for documents maintained elsewhere.
    history: z.string().optional(),
  }),
})

export const collections = { pages, docs }
