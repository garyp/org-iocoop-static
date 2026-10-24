import { getCollection } from "astro:content"

export const sections = {
  members: {
    label: "Member docs",
    href: "/docs/members/",
    blurb: "How-tos and reference for running your servers and taking part in the co-op.",
  },
  policies: {
    label: "Policies",
    href: "/docs/policies/",
    blurb: "Our bylaws, terms of service and the other documents that govern the co-op.",
  },
}

export function docHref(id) {
  return `/docs/${id}/`
}

export function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })
}

function compareDocs(first, second) {
  return first.data.order - second.data.order || first.data.title.localeCompare(second.data.title)
}

export async function getSectionDocs(section) {
  const entries = await getCollection("docs", (entry) => entry.id.startsWith(`${section}/`))
  return entries.sort(compareDocs)
}

// Nests docs under the doc whose id is their parent folder, e.g. members/committees/finance
// sits under members/committees.
export function buildTree(entries) {
  const nodes = new Map(
    entries.map((entry) => [entry.id, { entry, href: docHref(entry.id), children: [] }]),
  )
  const roots = []
  for (const node of nodes.values()) {
    const parentId = node.entry.id.split("/").slice(0, -1).join("/")
    const parent = nodes.get(parentId)
    ;(parent ? parent.children : roots).push(node)
  }
  return roots
}

export function flattenTree(tree) {
  return tree.flatMap((node) => [node, ...flattenTree(node.children)])
}

export function groupDocs(entries) {
  const groups = new Map()
  for (const entry of entries) {
    const title = entry.data.group ?? "Documents"
    if (!groups.has(title)) groups.set(title, [])
    groups.get(title).push(entry)
  }
  return [...groups].map(([title, items]) => ({ title, items }))
}
