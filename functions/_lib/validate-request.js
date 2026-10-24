import { emailPattern, hostnamePattern, isSshPublicKey } from "./patterns.js"

const textLimit = 400
const textareaLimit = 2000
const sshKeysLimit = 5000
const maxSshKeys = 10
const phonePattern = /^\+?[\d\s().-]{6,30}$/

function isShown(field, raw) {
  const rule = field.showWhen
  if (!rule) return true
  const watched = raw[rule.field] ?? ""
  if ("equals" in rule) return watched === rule.equals
  if ("moreThan" in rule) return watched !== "" && Number(watched) > rule.moreThan
  return true
}

// Returns { value, error } for one field. `value` is what appears in the email: select fields
// give their label ("Ubuntu 26.04 LTS (Resolute)") and numbers their normalized digits.
function checkField(field, raw) {
  const required = Boolean(field.required)
  const missing = {
    error: field.type === "select" ? "Please choose an option." : "Please fill this in.",
  }

  switch (field.type) {
    case "select": {
      if (raw === "") return required ? missing : { value: "" }
      const option = field.options.find((candidate) => candidate.value === raw)
      return option ? { value: option.label } : { error: "Please choose one of the options." }
    }

    case "number": {
      if (raw === "") return required ? missing : { value: "" }
      const number = Number(raw)
      if (!Number.isFinite(number)) return { error: "Please enter a number." }
      if (field.integer !== false && !Number.isInteger(number)) {
        return { error: "Please enter a whole number." }
      }
      if (field.min !== undefined && number < field.min)
        return { error: `Must be at least ${field.min}.` }
      if (field.max !== undefined && number > field.max)
        return { error: `Must be at most ${field.max}.` }
      if (field.lessThan !== undefined && number >= field.lessThan) {
        return { error: `Must be less than ${field.lessThan}.` }
      }
      return { value: String(number) }
    }

    case "sshkeys": {
      if (raw === "") return required ? missing : { value: "" }
      if (/PRIVATE KEY/i.test(raw)) {
        return {
          error:
            "That looks like a private key. Never share it; paste the public key (.pub) instead.",
        }
      }
      if (raw.length > sshKeysLimit) return { error: "That is too long to be an SSH public key." }
      const keys = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
      if (keys.length > maxSshKeys) return { error: `Please give at most ${maxSshKeys} keys.` }
      if (!keys.every(isSshPublicKey)) {
        return {
          error:
            "That doesn't look like an SSH public key. It should start with ssh-ed25519 or ssh-rsa.",
        }
      }
      return { value: keys.join("\n") }
    }

    case "textarea": {
      const value = raw.replace(/\r\n/g, "\n")
      if (value === "") return required ? missing : { value: "" }
      if (value.length > (field.maxlength ?? textareaLimit)) {
        return { error: `Please keep this under ${field.maxlength ?? textareaLimit} characters.` }
      }
      return { value }
    }

    default: {
      // text, email, tel, hostname: single lines
      const value = raw.replace(/[\r\n]+/g, " ")
      if (value === "") return required ? missing : { value: "" }
      if (value.length > (field.maxlength ?? textLimit)) {
        return { error: `Please keep this under ${field.maxlength ?? textLimit} characters.` }
      }
      if (field.type === "email" && !emailPattern.test(value)) {
        return { error: "That doesn't look like an email address." }
      }
      if (
        field.type === "tel" &&
        (!phonePattern.test(value) || value.replace(/\D/g, "").length < 6)
      ) {
        return { error: "Please enter a phone number." }
      }
      if (field.type === "hostname") {
        const hostname = value.toLowerCase()
        if (!hostnamePattern.test(hostname)) {
          return { error: "Please enter a fully qualified hostname, like myhost.example.com." }
        }
        return { value: hostname }
      }
      return { value }
    }
  }
}

// Validates a submission against one entry of requestForms. `values` holds only the fields that
// were shown, so hidden conditional fields never reach the email.
export function validateRequest(form, formData) {
  const raw = {}
  for (const field of form.fields) raw[field.name] = String(formData.get(field.name) ?? "").trim()

  const values = {}
  const errors = {}
  for (const field of form.fields) {
    if (!isShown(field, raw)) continue
    const { value, error } = checkField(field, raw[field.name])
    if (error) errors[field.name] = error
    else values[field.name] = value
  }

  // Rules across fields only make sense once the fields themselves are valid.
  for (const check of form.checks ?? []) {
    for (const [name, message] of Object.entries(check({ ...raw }) ?? {})) {
      if (!errors[name]) errors[name] = message
    }
  }
  return { values, errors }
}
