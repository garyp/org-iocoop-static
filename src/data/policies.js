// Maps each document in the vendor/policies submodule (github.com/iocoop/policies) to its place on
// this site. scripts/sync-policies.js reads this; src/data/redirects.js reuses the slugs.
//
// `order` sorts the sidebar for the whole section, so keep it unique across groups.
//
// `file` is the upstream file name without ".md" and doubles as the old /policies/<file> path.
export const policies = [
  {
    file: "articles-of-incorporation",
    slug: "articles",
    group: "Governing documents",
    order: 1,
    description: "The articles of incorporation of IO Cooperative, Inc.",
  },
  {
    file: "bylaws",
    slug: "bylaws",
    group: "Governing documents",
    order: 2,
    description: "The bylaws that govern how IO Cooperative, Inc. is run.",
  },
  {
    file: "membership-disclosure",
    slug: "membership-disclosure",
    group: "Governing documents",
    order: 3,
    description: "Disclosures provided to prospective members of IO Cooperative, Inc.",
  },
  {
    file: "electronic-consent",
    slug: "electronic-communications",
    group: "Governing documents",
    order: 4,
    description: "Consent and notice regarding electronic communications.",
  },
  {
    file: "terms-of-service",
    slug: "terms",
    group: "Policies",
    order: 11,
    description: "The terms that apply to everyone who uses our services.",
  },
  {
    file: "privacy-policy",
    slug: "privacy",
    group: "Policies",
    order: 12,
    description: "How we handle and protect your data.",
  },
  {
    file: "billing-policy",
    slug: "billing",
    group: "Policies",
    order: 13,
    description: "How billing, payment and late balances work.",
  },
  {
    file: "security-policy",
    slug: "security",
    group: "Policies",
    order: 14,
    description: "How we keep our services and data secure.",
  },
  {
    file: "anti-spam-policy",
    slug: "anti-spam",
    group: "Policies",
    order: 15,
    description: "What counts as spam and how we respond to it.",
  },
  {
    file: "abuse-policy",
    slug: "abuse",
    group: "Policies",
    order: 16,
    description: "How we handle abuse reports about a member's IP address.",
  },
  {
    file: "dmca",
    slug: "dmca",
    group: "Policies",
    order: 17,
    description: "How to send a DMCA notice or counter-notification.",
  },
]

export const policySlugs = Object.fromEntries(policies.map((policy) => [policy.file, policy.slug]))
