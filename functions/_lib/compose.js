// Turns validated form values into the email that gets sent: who it goes to, and its subject and
// plain-text body. Kept apart from delivery so any provider can send what this builds.

export function composeContactEmail(values, purpose, recipient) {
  const { name, email, subject, message } = values
  const shortSubject = subject.length > 150 ? `${subject.slice(0, 149)}…` : subject
  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Purpose: ${purpose.label}`,
    `Subject: ${subject || "(none)"}`,
    "",
    message || "(no message)",
    "",
    "--",
    "Sent from the iocoop.org contact form.",
  ].join("\n")
  return {
    to: recipient,
    replyTo: email,
    subject: `[Contact form: ${purpose.label}] ${shortSubject || "(no subject)"}`,
    text,
  }
}

// `form` is one entry of requestForms (src/data/request-forms.js); `values` comes from
// validateRequest, which leaves out fields that weren't shown.
export function composeRequestEmail(form, values, recipient) {
  // The page tells the visitor that a request made while the service is full joins the waiting
  // list, so the people reading the email need to see that too.
  const waitingList = form.available === false
  const lines = [form.title, ""]
  if (waitingList) {
    lines.push(
      `WAITING LIST: ${form.serviceName} was not available when this request was submitted.`,
      "",
    )
  }
  let section = null
  for (const field of form.fields) {
    if (!(field.name in values)) continue
    if (field.section !== section) {
      section = field.section
      if (lines.at(-1) !== "") lines.push("")
      lines.push(`${section}`, "-".repeat(section.length))
    }
    const raw = values[field.name]
    const value = raw ? `${raw}${field.unit ? ` ${field.unit}` : ""}` : "(none)"
    if (value.includes("\n")) {
      lines.push(`${field.label}:`, ...value.split("\n").map((line) => `  ${line}`))
    } else {
      lines.push(`${field.label}: ${value}`)
    }
  }
  lines.push("", "--", `Sent from the iocoop.org ${form.serviceName} request form.`)

  return {
    to: recipient,
    replyTo: values[form.replyToField],
    subject: `[${waitingList ? `${form.emailTag}: waiting list` : form.emailTag}] ${values[form.subjectField]}`,
    text: lines.join("\n"),
  }
}
