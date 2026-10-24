// Sends the message by email through a Cloudflare Email Routing `send_email` binding named EMAIL.
// The sender must be on a domain with Email Routing enabled, and the recipient must be a verified
// destination address. The recipient arrives on the submission, already chosen from the visitor's
// purpose (see routing.js). To use a different provider, replace `deliver` and keep its signature.
const encoder = new TextEncoder()

function toBase64(text) {
  let binary = ""
  for (const byte of encoder.encode(text)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

// Header values may only be printable ASCII. Anything else becomes RFC 2047 "encoded words",
// split on character boundaries so each word stays within the 75-character limit.
export function encodeHeader(value) {
  const clean = value.replace(/[\r\n]+/g, " ")
  if (/^[\x20-\x7e]*$/.test(clean)) return clean

  const words = []
  let chunk = ""
  for (const character of clean) {
    if (encoder.encode(chunk + character).length > 30) {
      words.push(chunk)
      chunk = ""
    }
    chunk += character
  }
  if (chunk) words.push(chunk)
  return words.map((word) => `=?UTF-8?B?${toBase64(word)}?=`).join("\r\n ")
}

export function buildMimeMessage({ from, submission }) {
  const { name, email, subject, message, purposeLabel, recipient: to } = submission
  const shortSubject = subject.length > 150 ? `${subject.slice(0, 149)}…` : subject
  const body = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Purpose: ${purposeLabel}`,
    `Subject: ${subject || "(none)"}`,
    "",
    message || "(no message)",
    "",
    "--",
    "Sent from the iocoop.org contact form.",
  ].join("\n")

  const domain = from.split("@")[1]
  const wrappedBody = toBase64(body)
    .match(/.{1,76}/g)
    .join("\r\n")
  return [
    `From: IO Cooperative Website <${from}>`,
    `To: ${to}`,
    `Reply-To: ${email}`,
    `Subject: ${encodeHeader(`[Contact form: ${purposeLabel}] ${shortSubject || "(no subject)"}`)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrappedBody,
    "",
  ].join("\r\n")
}

export async function deliver(submission, env) {
  if (!env.EMAIL) throw new Error("The EMAIL send_email binding is not configured")
  // Only exists inside the Cloudflare runtime, so it can't be imported at the top of the file.
  const { EmailMessage } = await import("cloudflare:email")
  const raw = buildMimeMessage({ from: env.CONTACT_FROM, submission })
  await env.EMAIL.send(new EmailMessage(env.CONTACT_FROM, submission.recipient, raw))
}
