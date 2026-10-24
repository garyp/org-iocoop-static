import { findPurpose } from "./routing.js"

// Validation for the contact form. Field names match the inputs in src/components/ContactForm.astro.
const limits = { name: 400, email: 400, subject: 400, message: 2000 }

// Deliberately plain: something@something.tld, with none of the characters that matter in a header.
const emailPattern = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/

export function validateSubmission(formData) {
  const text = (field) => String(formData.get(field) ?? "").trim()
  const values = {
    name: text("name").replace(/[\r\n]+/g, " "),
    email: text("email"),
    purpose: text("purpose"),
    subject: text("subject").replace(/[\r\n]+/g, " "),
    message: text("message").replace(/\r\n/g, "\n"),
  }

  const errors = {}
  if (!values.name) errors.name = "Please enter your name."
  if (!values.email) errors.email = "Please enter your email address."
  else if (!emailPattern.test(values.email))
    errors.email = "That doesn't look like an email address."

  if (!findPurpose(values.purpose)) errors.purpose = "Please choose what this is about."

  for (const [field, limit] of Object.entries(limits)) {
    if (!errors[field] && values[field].length > limit) {
      errors[field] = `Please keep this under ${limit} characters.`
    }
  }
  return { values, errors }
}
