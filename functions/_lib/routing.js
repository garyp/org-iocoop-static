import { contactPurposes } from "../../src/data/contact-purposes.js"

export function findPurpose(value) {
  return contactPurposes.find((purpose) => purpose.value === value)
}

// The inbox for a purpose: its own variable if set, otherwise the catch-all CONTACT_TO.
export function recipientFor(purpose, env) {
  return env[purpose.recipientVariable] || env.CONTACT_TO || null
}
