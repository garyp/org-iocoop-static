import { describe, expect, test } from "bun:test"
import { contactPurposes } from "../src/data/contact-purposes.js"
import { composeContactEmail } from "../functions/_lib/compose.js"
import { createContactHandler } from "../functions/_lib/contact-handler.js"
import { buildMimeMessage, encodeHeader } from "../functions/_lib/deliver.js"
import { validateSubmission } from "../functions/_lib/validate.js"

const env = {
  TURNSTILE_SECRET_KEY: "secret",
  CONTACT_FROM: "website@iocoop.org",
  CONTACT_TO: "fallback@example.org",
  CONTACT_TO_BILLING: "billing-inbox@example.org",
}

function formOf(fields) {
  const formData = new FormData()
  for (const [field, value] of Object.entries(fields)) formData.append(field, value)
  return formData
}

const goodFields = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  purpose: "general",
  subject: "Hello",
  message: "I would like to know more.",
  "cf-turnstile-response": "token-123",
}

function contactRequest(fields, headers = {}) {
  return new Request("https://iocoop.org/api/contact", {
    method: "POST",
    body: formOf(fields),
    headers,
  })
}

// Runs the handler with fake network and delivery, and records what they were asked to do.
async function submit(
  fields,
  { turnstile = { success: true }, deliverError, headers, environment = env } = {},
) {
  const delivered = []
  const verifications = []
  const handler = createContactHandler({
    fetchImpl: async (url, init) => {
      verifications.push({ url, form: init.body })
      if (turnstile instanceof Error) throw turnstile
      return new Response(JSON.stringify(turnstile))
    },
    deliverImpl: async (submission) => {
      if (deliverError) throw deliverError
      delivered.push(submission)
    },
  })
  const response = await handler({ request: contactRequest(fields, headers), env: environment })
  return { response, body: await response.json(), delivered, verifications }
}

describe("validateSubmission", () => {
  test("accepts a complete submission and trims it", () => {
    const { values, errors } = validateSubmission(formOf({ ...goodFields, name: "  Ada  " }))
    expect(errors).toEqual({})
    expect(values.name).toBe("Ada")
  })

  test("requires a name, an email and a purpose, but not a subject or message", () => {
    const { errors } = validateSubmission(formOf({ name: "", email: "", purpose: "" }))
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "purpose"])
    const minimal = { name: "Ada", email: "ada@example.com", purpose: "general" }
    expect(validateSubmission(formOf(minimal)).errors).toEqual({})
  })

  test("accepts every purpose the form offers and nothing else", () => {
    for (const { value } of contactPurposes) {
      const { errors } = validateSubmission(formOf({ ...goodFields, purpose: value }))
      expect(errors.purpose).toBeUndefined()
    }
    for (const purpose of ["sales", "GENERAL", "general technical", "../legal"]) {
      const { errors } = validateSubmission(formOf({ ...goodFields, purpose }))
      expect(errors.purpose).toBeDefined()
    }
    const withoutPurpose = { ...goodFields }
    delete withoutPurpose.purpose
    expect(validateSubmission(formOf(withoutPurpose)).errors.purpose).toBeDefined()
  })

  test("rejects malformed addresses, including ones that could smuggle in headers", () => {
    const badAddresses = [
      "not-an-email",
      "a@b",
      "a b@example.com",
      "a@example.com,b@example.com",
      "<a@example.com>",
    ]
    for (const email of badAddresses) {
      expect(validateSubmission(formOf({ ...goodFields, email })).errors.email).toBeDefined()
    }
  })

  test("enforces the same length limits as the form", () => {
    const longMessage = validateSubmission(formOf({ ...goodFields, message: "x".repeat(2001) }))
    expect(longMessage.errors.message).toBeDefined()
    const maxMessage = validateSubmission(formOf({ ...goodFields, message: "x".repeat(2000) }))
    expect(maxMessage.errors.message).toBeUndefined()
    const longSubject = validateSubmission(formOf({ ...goodFields, subject: "x".repeat(401) }))
    expect(longSubject.errors.subject).toBeDefined()
  })

  test("flattens newlines in single-line fields", () => {
    const { values } = validateSubmission(
      formOf({ ...goodFields, subject: "Hi\r\nBcc: x@example.com" }),
    )
    expect(values.subject).not.toMatch(/[\r\n]/)
  })
})

describe("buildMimeMessage", () => {
  const decodeBody = (raw) =>
    new TextDecoder().decode(
      Uint8Array.from(atob(raw.split("\r\n\r\n")[1].replace(/\r\n/g, "")), (character) =>
        character.charCodeAt(0),
      ),
    )
  const build = (email) =>
    buildMimeMessage({
      from: "website@iocoop.org",
      to: "inbox@example.org",
      replyTo: "ada@example.com",
      subject: "Hello",
      text: "Hi there",
      ...email,
    })

  test("sets the routing headers and a decodable body", () => {
    const raw = build({ subject: "[Contact form: General inquiry] Hello", text: "Café ☕ — naïve" })
    expect(raw).toContain("To: inbox@example.org")
    expect(raw).toContain("Reply-To: ada@example.com")
    expect(raw).toContain("Subject: [Contact form: General inquiry] Hello")
    expect(raw).toContain("Content-Type: text/plain; charset=UTF-8")
    expect(decodeBody(raw)).toContain("Café ☕ — naïve")
  })

  test("addresses the message to the given recipient", () => {
    expect(build({ to: "billing-inbox@example.org" })).toContain("To: billing-inbox@example.org")
  })

  test("a subject can't add headers", () => {
    const raw = build({ subject: "Hello\r\nBcc: victim@example.com" })
    const headerBlock = raw.split("\r\n\r\n")[0]
    expect(headerBlock.split("\r\n").some((line) => line.startsWith("Bcc:"))).toBe(false)
  })

  test("refuses to build a message with a malformed address", () => {
    for (const bad of [
      "a@example.com\r\nBcc: x@example.com",
      "two words@example.com",
      "no-at-sign",
      "",
    ]) {
      expect(() => build({ replyTo: bad })).toThrow()
      expect(() => build({ to: bad })).toThrow()
    }
  })

  test("non-ASCII subjects are encoded and stay recoverable", () => {
    const original =
      "[Contact form: Technical support] Prix réduit pour les membres — café ☕ très long sujet ici"
    const encoded = encodeHeader(original)
    expect(encoded).toMatch(/^[\x20-\x7e\r\n]*$/)
    for (const word of encoded.split("\r\n ")) expect(word.length).toBeLessThanOrEqual(75)
    const decoded = encoded
      .split("\r\n ")
      .map((word) => Buffer.from(word.slice("=?UTF-8?B?".length, -2), "base64").toString("utf8"))
      .join("")
    expect(decoded).toBe(original)
  })
})

describe("composeContactEmail", () => {
  const purpose = { label: "Billing support" }
  const values = {
    name: "Ada",
    email: "ada@example.com",
    subject: "Invoice",
    message: "It looks wrong.",
  }

  test("addresses the visitor's reply and states the purpose", () => {
    const email = composeContactEmail(values, purpose, "billing-inbox@example.org")
    expect(email.to).toBe("billing-inbox@example.org")
    expect(email.replyTo).toBe("ada@example.com")
    expect(email.subject).toBe("[Contact form: Billing support] Invoice")
    expect(email.text).toContain("Name: Ada")
    expect(email.text).toContain("Purpose: Billing support")
    expect(email.text).toContain("It looks wrong.")
  })

  test("copes with an empty subject and message", () => {
    const email = composeContactEmail(
      { ...values, subject: "", message: "" },
      purpose,
      "x@example.org",
    )
    expect(email.subject).toBe("[Contact form: Billing support] (no subject)")
    expect(email.text).toContain("(no message)")
  })

  test("shortens a very long subject", () => {
    const email = composeContactEmail(
      { ...values, subject: "s".repeat(400) },
      purpose,
      "x@example.org",
    )
    expect(email.subject.length).toBeLessThan(200)
  })
})

describe("contact handler", () => {
  test("delivers a valid, verified submission", async () => {
    const { response, body, delivered, verifications } = await submit(goodFields, {
      headers: { "CF-Connecting-IP": "203.0.113.9" },
    })
    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(delivered).toHaveLength(1)
    expect(delivered[0]).toMatchObject({
      to: "fallback@example.org",
      replyTo: "ada@example.com",
      subject: "[Contact form: General inquiry] Hello",
    })
    expect(delivered[0].text).toContain("Name: Ada Lovelace")
    expect(delivered[0].text).toContain("Purpose: General inquiry")
    expect(verifications).toHaveLength(1)
    expect(verifications[0].url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify")
    expect(verifications[0].form.get("secret")).toBe("secret")
    expect(verifications[0].form.get("response")).toBe("token-123")
    expect(verifications[0].form.get("remoteip")).toBe("203.0.113.9")
  })

  test("routes each purpose to its own inbox", async () => {
    const environment = {
      ...env,
      CONTACT_TO_GENERAL: "general-inbox@example.org",
      CONTACT_TO_TECHNICAL: "technical-inbox@example.org",
      CONTACT_TO_BILLING: "billing-inbox@example.org",
      CONTACT_TO_LEGAL: "legal-inbox@example.org",
    }
    for (const { value, label } of contactPurposes) {
      const { response, delivered } = await submit(
        { ...goodFields, purpose: value },
        { environment },
      )
      expect(response.status).toBe(200)
      expect(delivered[0].to).toBe(`${value}-inbox@example.org`)
      expect(delivered[0].subject).toContain(`[Contact form: ${label}]`)
    }
  })

  test("falls back to CONTACT_TO when a purpose has no inbox of its own", async () => {
    const technical = await submit({ ...goodFields, purpose: "technical" })
    expect(technical.delivered[0].to).toBe("fallback@example.org")
    const billing = await submit({ ...goodFields, purpose: "billing" })
    expect(billing.delivered[0].to).toBe("billing-inbox@example.org")
  })

  test("refuses a purpose it doesn't know instead of guessing a destination", async () => {
    const { response, body, delivered } = await submit({ ...goodFields, purpose: "sales" })
    expect(response.status).toBe(400)
    expect(body.fields.purpose).toBeDefined()
    expect(delivered).toHaveLength(0)
  })

  test("reports a misconfigured server instead of failing silently", async () => {
    for (const missing of ["TURNSTILE_SECRET_KEY", "CONTACT_FROM"]) {
      const { response, body, delivered } = await submit(goodFields, {
        environment: { ...env, [missing]: undefined },
      })
      expect(response.status).toBe(503)
      expect(body.error).not.toContain("@")
      expect(delivered).toHaveLength(0)
    }
  })

  test("reports a purpose with no inbox configured, and delivers nothing", async () => {
    const { response, body, delivered, verifications } = await submit(goodFields, {
      environment: { ...env, CONTACT_TO: undefined },
    })
    expect(response.status).toBe(503)
    expect(body.error).not.toContain("@")
    expect(delivered).toHaveLength(0)
    expect(verifications).toHaveLength(0)
  })

  test("silently drops honeypot submissions without verifying or delivering", async () => {
    const { response, body, delivered, verifications } = await submit({
      ...goodFields,
      website: "http://spam.example",
    })
    expect(response.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(delivered).toHaveLength(0)
    expect(verifications).toHaveLength(0)
  })

  test("returns field errors for invalid input and does not call Turnstile", async () => {
    const { response, body, delivered, verifications } = await submit({
      ...goodFields,
      email: "nope",
    })
    expect(response.status).toBe(400)
    expect(body.fields.email).toBeDefined()
    expect(delivered).toHaveLength(0)
    expect(verifications).toHaveLength(0)
  })

  test("requires a Turnstile token", async () => {
    const fields = { ...goodFields }
    delete fields["cf-turnstile-response"]
    const { response, delivered } = await submit(fields)
    expect(response.status).toBe(400)
    expect(delivered).toHaveLength(0)
  })

  test("refuses a token Turnstile rejects", async () => {
    const { response, delivered } = await submit(goodFields, {
      turnstile: { success: false, "error-codes": ["invalid-input-response"] },
    })
    expect(response.status).toBe(400)
    expect(delivered).toHaveLength(0)
  })

  test("asks the visitor to retry when Turnstile itself is unreachable", async () => {
    const { response, delivered } = await submit(goodFields, {
      turnstile: new Error("network down"),
    })
    expect(response.status).toBe(503)
    expect(delivered).toHaveLength(0)
  })

  test("asks the visitor to retry when delivery fails, without revealing any email address", async () => {
    const { response, body } = await submit(goodFields, { deliverError: new Error("smtp down") })
    expect(response.status).toBe(502)
    expect(body.error).toContain("try again")
    expect(body.error).not.toContain("@")
  })

  test("rejects oversized requests", async () => {
    const { response, delivered } = await submit(goodFields, {
      headers: { "Content-Length": "500000" },
    })
    expect(response.status).toBe(413)
    expect(delivered).toHaveLength(0)
  })
})
