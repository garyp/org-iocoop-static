import { policySlugs } from "./policies.js"
import { memberPortal } from "./site.js"

// Old iocoop.org paths that moved. Keys are the old paths (without a trailing slash). Two things
// are built from this file:
//
// - Astro writes an HTML redirect page for every entry in `redirects`. This works on any host.
// - `redirectsFile()` writes dist/_redirects (see astro.config.mjs): real HTTP 301s, read by
//   Cloudflare Pages and Netlify. It also carries `wildcardRedirects`, which Astro can't express in
//   a static build, so those only work on a host that applies `_redirects` (or an equivalent).

const memberDocs = {
  "bandwidth-graphs": "bandwidth-graphs",
  billing: "billing",
  committees: "committees",
  "committees/administrative-legal-committee-charter": "committees/administrative-legal",
  "committees/facilities-committee-charter": "committees/facilities",
  "committees/finance-committee-charter": "committees/finance",
  "committees/operations-committee-charter": "committees/operations",
  "email-lists": "email-lists",
  finances: "finances",
  matrix: "matrix",
  "pdu-power-control": "pdu-power-control",
  "prepare-and-rack-a-machine": "rack-a-machine",
  "regaining-access-to-your-server-or-vps": "regaining-access",
  "vpn-and-management-server-access": "vpn-access",
  "vps-command-and-control": "vps-control",
}

// Pages that kept their purpose but changed address. The old site already sent the last three
// where they go here (its own redirects, checked against the live site).
const movedPages = {
  "/about-us": "/about/",
  "/services/colocation/colocate-your-server": "/services/colocation/",
  "/services/colocation/how-to-ship-a-machine-for-installation": "/docs/members/rack-a-machine/",
  "/services/virtual-private-servers/vps-request":
    "/services/virtual-private-servers/#request-a-vps",
  // The contact page isn't built yet; this points at where it will live.
  "/contactio": "/contact/",
}

export const redirects = {
  ...movedPages,
  "/member_docs": "/docs/members/",
  // The member portal moved to its own host. Only the bare path gets an HTML page; everything
  // beneath it is covered by the wildcard rule below.
  "/members": `${memberPortal}/`,
  "/policies": "/docs/policies/",
  // This page already redirected to the members-only wiki on the old site.
  "/member_docs/remote-serial-console":
    "https://github.com/iocoop/members/wiki/Console-Server-and-Serial-Aggregator#deprecated-member-documentation",
  ...Object.fromEntries(
    Object.entries(memberDocs).map(([oldSlug, newSlug]) => [
      `/member_docs/${oldSlug}`,
      `/docs/members/${newSlug}/`,
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(policySlugs).map(([oldSlug, newSlug]) => [
      `/policies/${oldSlug}`,
      `/docs/policies/${newSlug}/`,
    ]),
  ),
}

// Wildcards: `*` matches the rest of the path and `:splat` puts it in the destination, so
// /members/systems/ goes to https://members.iocoop.org/systems/.
export const wildcardRedirects = {
  "/members/*": `${memberPortal}/:splat`,
}

// The contents of dist/_redirects. Static rules are written with and without a trailing slash,
// since hosts differ on whether /a and /a/ are the same path.
export function redirectsFile() {
  const staticRules = Object.entries(redirects).flatMap(([from, to]) => [
    `${from} ${to} 301`,
    `${from}/ ${to} 301`,
  ])
  const wildcardRules = Object.entries(wildcardRedirects).map(([from, to]) => `${from} ${to} 301`)
  return [
    "# Generated from src/data/redirects.js at build time. Do not edit.",
    ...staticRules,
    ...wildcardRules,
    "",
  ].join("\n")
}
