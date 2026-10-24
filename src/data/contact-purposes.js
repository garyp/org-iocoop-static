// What the contact form's "purpose" menu offers, and how each choice is routed. The form
// (src/components/ContactForm.astro) and the server (functions/_lib/) both read this list, so they
// can't disagree.
//
// No email addresses live here. Each purpose names the environment variable (a Cloudflare Pages
// secret) that holds its recipient; if that variable isn't set, the message goes to CONTACT_TO.
export const contactPurposes = [
  { value: "general", label: "General inquiry", recipientVariable: "CONTACT_TO_GENERAL" },
  { value: "technical", label: "Technical support", recipientVariable: "CONTACT_TO_TECHNICAL" },
  { value: "billing", label: "Billing support", recipientVariable: "CONTACT_TO_BILLING" },
  { value: "legal", label: "Legal issue", recipientVariable: "CONTACT_TO_LEGAL" },
]

export const defaultPurpose = "general"
