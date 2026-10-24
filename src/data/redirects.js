import { policySlugs } from "./policies.js"

// Old iocoop.org paths that moved into /docs. Keys are the old paths (without a trailing slash);
// Astro writes a redirect page for each. If the site ends up on a host with native redirect
// rules, generate those from this same list.

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

export const redirects = {
  "/member_docs": "/docs/members/",
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
