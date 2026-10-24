// Shared navigation and pricing. Paths other than /about/ point at the
// current iocoop.org URLs; update them as pages move into this site.

export const navLinks = [
  { href: "/about/", label: "About" },
  { href: "/services/", label: "Services" },
  { href: "/docs/", label: "Docs" },
  { href: "/support/", label: "Support" },
  { href: "/contactio/", label: "Contact" },
]

export const memberPortal = "https://members.iocoop.org"
export const joinUrl = "/join/"
export const supportEmail = "support@iocoop.org"

export const footerColumns = [
  {
    title: "Co-op",
    links: [
      { label: "About", href: "/about/" },
      { label: "Join", href: joinUrl },
      { label: "Policies", href: "/docs/policies/" },
    ],
  },
  {
    title: "Members",
    links: [
      { label: "Member portal", href: memberPortal },
      { label: "Member docs", href: "/docs/members/" },
      { label: "Member wiki", href: "https://github.com/iocoop/members/wiki" },
      { label: "Billing", href: "https://my.freshbooks.com" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Support", href: "/support/" },
      { label: "Contact", href: "/contactio/" },
    ],
  },
]

// Prices are set to match costs; change them here and the homepage follows.
export const pricing = {
  vps: {
    price: "$86.25",
    unit: "per slice, per year",
    short: "$86.25 / year",
    features: ["1 GB RAM", "25 GB disk", "10 Mbps at 95th percentile", "Full root / admin access"],
    details: [
      "1 GB RAM",
      "25 GB disk",
      "10 Mbps at 95th percentile",
      "1 static public IPv4 address",
      "A static /80 subnet of public IPv6 addresses",
      "Shared use of about 0.5 CPU",
      "Remote VPS admin over SSH",
    ],
    addons: [
      {
        label: "Extra disk",
        price: "$23",
        unit: "per 25 GB unit, per year",
        note: "Up to one extra unit per slice.",
      },
      { label: "Extra bandwidth", price: "$6.96", unit: "per Mbps, per year" },
    ],
    vcpus: [
      { slices: "1-2", vcpus: 1 },
      { slices: "3-4", vcpus: 2 },
      { slices: "5-6", vcpus: 3 },
      { slices: "7-8", vcpus: 4 },
    ],
    available: true,
  },
  colo: {
    price: "$28.75",
    unit: "per month, base package",
    short: "from $28.75 / mo",
    features: [
      "1U, 30 W power & cooling",
      "50 Mbps at 95th on a 1 Gbps port",
      "1 IPv4 address, IPv6 included",
      "2 remote power-cycle outlets",
    ],
    details: [
      "1, 1U rack-mountable server",
      "30 W power and cooling (about 0.144 A at 208 V)",
      "1 IPv4 address, IPv6 supported",
      "50 Mbps at 95th percentile, on a 1 Gbps RJ45 port (limit one per member)",
      "Up to 2 remote power-cyclable outlets",
      "IPMI access",
    ],
    addons: [
      {
        label: "Extra power",
        price: "$0.58",
        unit: "per watt, per month",
        note: "If your host uses 50 W, that is 20 W over the base: $11.60 a month.",
      },
      {
        label: "Extra bandwidth",
        price: "$0.58",
        unit: "per Mbps, per month",
        note: "If your 95th percentile is 75 Mbps, that is 25 Mbps over the base: $14.50 a month.",
      },
      { label: "Extra IPv4 address", price: "$1.15", unit: "per address, per month" },
      { label: "Extra rack space", price: "$23", unit: "per additional 1U, per month" },
    ],
    available: false,
  },
}
