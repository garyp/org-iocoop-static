import { policySlugs } from "./policies.js"
import { memberPortal } from "./site.js"

// Old iocoop.org paths that moved. Keys are the old paths (without a trailing slash). Astro writes
// an HTML redirect page for every entry (a meta refresh, since GitHub Pages can't send real 301s).
// There are no wildcards: old /members/<path> addresses beyond /members itself are not redirected.

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
  // The member portal moved to its own host. Only the bare path is redirected.
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
