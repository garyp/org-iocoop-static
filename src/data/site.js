// Shared navigation and pricing. Paths other than /about/ point at the
// current iocoop.org URLs; update them as pages move into this site.

export const navLinks = [
  { href: "/about/", label: "About" },
  { href: "/services/", label: "Services" },
  { href: "/member_docs/", label: "Docs" },
  { href: "/support/", label: "Support" },
  { href: "/contactio/", label: "Contact" },
]

export const memberPortal = "/members/"
export const joinUrl = "/join/"

export const footerColumns = [
  {
    title: "Co-op",
    links: [
      { label: "About", href: "/about/" },
      { label: "Join", href: joinUrl },
      { label: "Policies", href: "/policies/" },
    ],
  },
  {
    title: "Members",
    links: [
      { label: "Member portal", href: memberPortal },
      { label: "Member docs", href: "/member_docs/" },
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
    addons: [
      { label: "Extra power", price: "$0.58/W" },
      { label: "Extra bandwidth", price: "$0.58/Mbps" },
      { label: "Extra IPv4", price: "$1.15" },
      { label: "Extra 1U", price: "$23" },
    ],
    available: false,
  },
}
