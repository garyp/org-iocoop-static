// The VPS and colocation request forms, defined once. RequestForm.astro renders them and
// functions/_lib/validate-request.js validates them, so the page and the server can't disagree.
//
// A field has: name, label, type (text, email, tel, hostname, number, select, textarea, sshkeys,
// checkbox), section (the heading it appears under), and optionally required, help, helpLinks, placeholder,
// autocomplete, maxlength, half (share a row), plus per type:
//   number:   min, max, lessThan (exclusive), integer (default true), unit, defaultValue
//   select:   options [{ value, label }], defaultValue
//   textarea: rows
//   checkbox: checkboxLabel (the text beside the box); the value sent, and shown, is "Yes"
// `showWhen` shows a field only while another field matches: { field, equals } or
// { field, moreThan }. A hidden field is neither required nor submitted.
//
// A form may also set `endpoint` (default /api/request-<kind>), `submitLabel` (default "Send
// request"), `membersOnly: false` (drops the "Requests are for members" line) and `sentFrom` (the
// email's footer, default "<serviceName> request form"). The join form uses all four.
//
// `available` says whether the service is taking new customers right now. It comes from `pricing`
// in site.js, the same flags that drive the "Currently full" badges. While it is false, the form
// shows a waiting-list warning and the email it produces is tagged as a waiting-list request.
//
// Recipients are never listed here. `recipientVariables` names the environment variables (Cloudflare
// secrets) to try in order, so the addresses stay out of the repo.
import { pricing } from "./site.js"

const maxSlices = 8 // an instance can be up to 8 slices (see the VPS page)

const numbered = (from, to, labelFor = String) =>
  Array.from({ length: to - from + 1 }, (_, index) => ({
    value: String(from + index),
    label: labelFor(from + index),
  }))

const extraDisk = pricing.vps.addons.find((addon) => addon.label === "Extra disk")

const sshKeyHelp = {
  help: "Paste your public key: the contents of id_ed25519.pub or id_rsa.pub, one key per line. Never paste a private key.",
  helpLinks: [
    {
      label: "How to generate an SSH key",
      href: "https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent",
    },
  ],
}

export const requestForms = {
  vps: {
    title: "VPS request",
    serviceName: "VPS",
    available: pricing.vps.available,
    successMessage:
      "Thanks, your VPS request is on its way. We'll be in touch as soon as someone can.",
    emailTag: "VPS request",
    subjectField: "hostname",
    replyToField: "memberEmail",
    recipientVariables: ["REQUEST_TO_VPS", "CONTACT_TO_TECHNICAL", "CONTACT_TO"],
    fields: [
      {
        name: "memberEmail",
        label: "Member email address",
        type: "email",
        section: "About you",
        required: true,
        autocomplete: "email",
        help: "The email address of your IO Coöperative membership.",
      },
      {
        name: "contactName",
        label: "Primary contact name",
        type: "text",
        section: "About you",
        required: true,
        autocomplete: "name",
        half: true,
      },
      {
        name: "contactPhone",
        label: "Primary contact phone",
        type: "tel",
        section: "About you",
        required: true,
        autocomplete: "tel",
        half: true,
      },
      {
        name: "mailingAddress",
        label: "Mailing address",
        type: "textarea",
        section: "About you",
        required: true,
        rows: 3,
        autocomplete: "street-address",
      },
      {
        name: "organization",
        label: "Organization",
        type: "text",
        section: "About you",
        autocomplete: "organization",
        help: "If you're joining as an individual, leave this blank.",
      },
      {
        name: "extraContacts",
        label: "Additional authorized contacts",
        type: "textarea",
        section: "About you",
        rows: 3,
        placeholder: "Jane Doe <jane@example.com>",
        help: "Name and email, one per line.",
      },
      {
        name: "hostname",
        label: "Hostname",
        type: "hostname",
        section: "Your VPS",
        required: true,
        placeholder: "myhost.example.com",
        help: "Used for reverse DNS, so it must be fully qualified.",
      },
      {
        name: "slices",
        label: "Number of slices",
        type: "select",
        section: "Your VPS",
        required: true,
        half: true,
        options: numbered(1, maxSlices),
        defaultValue: "1",
        help: `Each slice gives you 1 GB RAM, 25 GB disk and 10 Mbps at the 95th percentile, at ${pricing.vps.price} ${pricing.vps.unit}.`,
      },
      {
        name: "extraDisk",
        label: "Extra disk",
        type: "select",
        section: "Your VPS",
        half: true,
        options: [
          { value: "0", label: "None" },
          ...numbered(1, maxSlices, (count) => `${count} × 25 GB`),
        ],
        defaultValue: "0",
        help: `${extraDisk.price} ${extraDisk.unit}. No more than your number of slices.`,
      },
      {
        name: "os",
        label: "Operating system",
        type: "select",
        section: "Your VPS",
        required: true,
        // What members can pick from: the two newest Ubuntu LTS releases and the two newest major
        // Debian releases. Update this when a new one ships (release dates and support windows:
        // https://endoflife.date/ubuntu and https://endoflife.date/debian). Last updated 2026-10.
        options: [
          { value: "ubuntu-26.04", label: "Ubuntu 26.04 LTS (Resolute)" },
          { value: "ubuntu-24.04", label: "Ubuntu 24.04 LTS (Noble)" },
          { value: "debian-13", label: "Debian 13 (Trixie)" },
          { value: "debian-12", label: "Debian 12 (Bookworm)" },
          { value: "other", label: "Other (specify)" },
        ],
        defaultValue: "ubuntu-26.04",
        help: "Other operating systems are available on request and need manual setup.",
      },
      {
        name: "osOther",
        label: "Which operating system?",
        type: "text",
        section: "Your VPS",
        required: true,
        placeholder: "Rocky Linux 9",
        showWhen: { field: "os", equals: "other" },
      },
      {
        name: "sshKey",
        label: "SSH public key",
        type: "sshkeys",
        section: "Your VPS",
        required: true,
        rows: 4,
        ...sshKeyHelp,
      },
      {
        name: "comments",
        label: "Anything else we should know",
        type: "textarea",
        section: "Anything else",
        rows: 4,
      },
    ],
    // Rules that involve more than one field. Each returns { fieldName: message } or nothing.
    checks: [
      (values) =>
        Number(values.extraDisk) > Number(values.slices)
          ? { extraDisk: "Extra disk can't be more than your number of slices." }
          : null,
    ],
  },

  colocation: {
    title: "Colocation request",
    serviceName: "Colocation",
    available: pricing.colo.available,
    successMessage:
      "Thanks, your colocation request is on its way. We'll be in touch as soon as someone can.",
    emailTag: "Colocation request",
    subjectField: "hostname",
    replyToField: "memberEmail",
    recipientVariables: ["REQUEST_TO_COLOCATION", "CONTACT_TO_TECHNICAL", "CONTACT_TO"],
    fields: [
      {
        name: "memberEmail",
        label: "Member email address",
        type: "email",
        section: "About you",
        required: true,
        autocomplete: "email",
        help: "The email address of your IO Coöperative membership.",
      },
      {
        name: "hostname",
        label: "Hostname",
        type: "hostname",
        section: "Your server",
        required: true,
        placeholder: "myhost.example.com",
        help: "Used for reverse DNS, so it must be fully qualified. Please label your server with its hostname on the front and back.",
      },
      {
        name: "brandModel",
        label: "Brand and model",
        type: "text",
        section: "Your server",
        required: true,
        help: "The make and model of your server.",
      },
      {
        name: "height",
        label: "Server height",
        type: "select",
        section: "Your server",
        required: true,
        half: true,
        options: numbered(1, 8, (units) => `${units}U`),
        defaultValue: "1",
        help: "Your server must have rails to mount it in the cabinet.",
        helpLinks: [
          { label: "What is a rack unit?", href: "https://en.wikipedia.org/wiki/Rack_unit" },
        ],
      },
      {
        name: "depth",
        label: "Server depth",
        type: "number",
        section: "Your server",
        required: true,
        half: true,
        min: 1,
        lessThan: 28.75,
        integer: false,
        unit: "inches",
        help: "The server must be less than 28.75 inches deep.",
      },
      {
        name: "watts",
        label: "Power consumption",
        type: "number",
        section: "Your server",
        required: true,
        half: true,
        min: 1,
        max: 3000,
        unit: "W",
        help: "Estimated, in watts. Your server must accept 208 volt power.",
        helpLinks: [
          {
            label: "Measure it with a Kill-a-watt",
            href: "https://en.wikipedia.org/wiki/Kill_A_Watt",
          },
        ],
      },
      {
        name: "powerSupplies",
        label: "Power supplies",
        type: "number",
        section: "Your server",
        required: true,
        half: true,
        min: 1,
        max: 8,
        defaultValue: "1",
        help: "The number of power supplies that have power sockets.",
        helpLinks: [
          {
            label: "Power supplies",
            href: "https://en.wikipedia.org/wiki/Power_supply_unit_(computer)",
          },
          { label: "C14 sockets", href: "https://en.wikipedia.org/wiki/IEC_60320#C14" },
        ],
      },
      {
        name: "socketOrientation",
        label: "Power socket orientation",
        type: "select",
        section: "Your server",
        required: true,
        options: [
          { value: "1-left", label: "1 on the left" },
          { value: "1-right", label: "1 on the right" },
          { value: "2-left", label: "2 on the left" },
          { value: "2-right", label: "2 on the right" },
          { value: "each-side", label: "One on each side" },
          { value: "other", label: "Other" },
        ],
        defaultValue: "1-left",
        help: "As viewed from the back of the server.",
      },
      {
        name: "bandwidth",
        label: "Bandwidth",
        type: "number",
        section: "Network",
        required: true,
        half: true,
        min: 0,
        max: 1000,
        unit: "Mbps",
        help: "Estimated, measured at the 95th percentile.",
        helpLinks: [
          {
            label: "What is the 95th percentile?",
            href: "https://en.wikipedia.org/wiki/Burstable_billing#95th_percentile",
          },
        ],
      },
      {
        name: "ipv4",
        label: "Public IPv4 addresses",
        type: "number",
        section: "Network",
        required: true,
        half: true,
        min: 0,
        max: 128,
        defaultValue: "1",
        help: "The number you will use within the first month. More can be assigned later when needed.",
      },
      {
        name: "ipv4Justification",
        label: "Why do you need more than one IPv4 address?",
        type: "textarea",
        section: "Network",
        required: true,
        rows: 3,
        showWhen: { field: "ipv4", moreThan: 1 },
        help: "Any more than 1 public IPv4 address requires written justification that we can provide to ARIN.",
        helpLinks: [
          {
            label: "What ARIN asks for",
            href: "https://www.arin.net/resources/guide/request/documentation/#requests-requiring-demonstration-of-utilization-of-end-user-assignments-by-isps",
          },
        ],
      },
      {
        name: "publicPorts",
        label: "Public network ports",
        type: "number",
        section: "Network",
        required: true,
        half: true,
        min: 0,
        max: 4,
        defaultValue: "1",
        help: "This is almost always 1.",
      },
      {
        name: "privatePorts",
        label: "Private network ports",
        type: "number",
        section: "Network",
        required: true,
        half: true,
        min: 0,
        max: 4,
        defaultValue: "0",
        help: "Needed for IPMI, or if you have multiple servers in the cabinet that need to be connected together.",
        helpLinks: [
          {
            label: "What is IPMI?",
            href: "https://en.wikipedia.org/wiki/Intelligent_Platform_Management_Interface",
          },
        ],
      },
      {
        name: "comments",
        label: "Anything else we should know",
        type: "textarea",
        section: "Anything else",
        rows: 4,
      },
    ],
    checks: [],
  },

  join: {
    title: "Membership application",
    serviceName: "Membership",
    // Joining is never "full", so there is no waiting list. (The flag is here because every form
    // has one.)
    available: true,
    endpoint: "/api/join",
    submitLabel: "Send application",
    membersOnly: false,
    sentFrom: "membership application form",
    successMessage:
      "Thanks, your application is on its way. Someone will be in touch at the email address you gave us.",
    emailTag: "Membership application",
    subjectField: "fullName",
    replyToField: "email",
    recipientVariables: ["JOIN_TO", "CONTACT_TO_GENERAL", "CONTACT_TO"],
    fields: [
      {
        name: "fullName",
        label: "Full legal name",
        type: "text",
        section: "About you",
        required: true,
        autocomplete: "name",
        help: "If you're joining as an organization, this is the person submitting the application.",
      },
      {
        name: "email",
        label: "Email address",
        type: "email",
        section: "About you",
        required: true,
        autocomplete: "email",
      },
      {
        // The bylaws allow one class of member: a natural person or an organization (sections 4.01
        // and 4.02). There is deliberately no "joint" membership.
        name: "membershipType",
        label: "Membership type",
        type: "select",
        section: "About you",
        required: true,
        options: [
          { value: "individual", label: "Individual" },
          { value: "organization", label: "Organization" },
        ],
        defaultValue: "individual",
      },
      {
        name: "organizationName",
        label: "Organization name",
        type: "text",
        section: "About you",
        required: true,
        autocomplete: "organization",
        showWhen: { field: "membershipType", equals: "organization" },
      },
      {
        name: "telephone",
        label: "Telephone number",
        type: "tel",
        section: "About you",
        required: true,
        autocomplete: "tel",
      },
      {
        name: "postalAddress",
        label: "Postal address",
        type: "textarea",
        section: "About you",
        required: true,
        rows: 3,
        autocomplete: "street-address",
      },
      {
        name: "policies",
        label: "Our policies",
        type: "checkbox",
        section: "About you",
        required: true,
        checkboxLabel: "I have read and agree to the Coöperative's policies.",
        helpLinks: [{ label: "Read the policies", href: "/docs/policies/" }],
      },
      {
        name: "githubUsername",
        label: "GitHub username",
        type: "text",
        section: "Accounts",
        maxlength: 39,
        autocomplete: "off",
        help: "We host member documentation and do ticketing in GitHub.",
      },
      {
        name: "googleEmail",
        label: "Google email address",
        type: "email",
        section: "Accounts",
        help: "We share documents and grant web access to the cooperative's monitoring and tooling using members' Google identities. This can be a gmail.com or Google Workspace address, or you can create a Google identity with your existing email address.",
        helpLinks: [
          {
            label: "How to create a Google identity",
            href: "https://support.google.com/accounts/answer/27441#existingemail",
          },
        ],
      },
      {
        name: "alternateEmail",
        label: "Alternate email address",
        type: "email",
        section: "Accounts",
        help: "If you will host your email on IO Coöperative infrastructure, we need an address hosted elsewhere so we can reach you during an outage.",
      },
      {
        name: "sshKey",
        label: "SSH public key",
        type: "sshkeys",
        section: "Accounts",
        rows: 4,
        help: "Used to access your IO Coöperative resources, such as a VPS or a VPN to the IPMI on your colocated server. Paste your public key (the contents of id_ed25519.pub or id_rsa.pub), one key per line. Never paste a private key.",
        helpLinks: sshKeyHelp.helpLinks,
      },
      {
        name: "referral",
        label: "Where did you hear about us?",
        type: "text",
        section: "Anything else",
        help: "If you know an existing member, let us know who that is.",
      },
      {
        name: "comments",
        label: "Other comments",
        type: "textarea",
        section: "Anything else",
        rows: 4,
      },
    ],
    checks: [],
  },
}
