import { contactPurposes } from "../../src/data/contact-purposes.js"

export function findPurpose(value) {
  return contactPurposes.find((purpose) => purpose.value === value)
}

// The first of these environment variables that has a value, or null if none do.
export function firstConfigured(variableNames, env) {
  for (const name of variableNames) if (env[name]) return env[name]
  return null
}

// A contact purpose's own inbox, otherwise the catch-all CONTACT_TO.
export function recipientFor(purpose, env) {
  return firstConfigured([purpose.recipientVariable, "CONTACT_TO"], env)
}
