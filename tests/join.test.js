import { describe, expect, test } from "bun:test"
import { requestForms } from "../src/data/request-forms.js"
import { composeRequestEmail } from "../functions/_lib/compose.js"
import { createRequestHandler } from "../functions/_lib/request-handler.js"
import { validateRequest } from "../functions/_lib/validate-request.js"

const goodApplication = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  membershipType: "individual",
  organizationName: "",
  telephone: "+1 (415) 555-0100",
  postalAddress: "12 Analytical Way\nSan Francisco, CA 94115",
  policies: "yes",
  githubUsername: "",
  googleEmail: "",
  alternateEmail: "",
  sshKey: "",
  referral: "",
  comments: "",
}

function formOf(fields) {
  const formData = new FormData()
  for (const [field, value] of Object.entries(fields)) formData.append(field, value)
  return formData
}

const apply = (overrides = {}) =>
  validateRequest(requestForms.join, formOf({ ...goodApplication, ...overrides }))

describe("validating a membership application", () => {
  test("accepts a minimal application", () => {
    const { values, errors } = apply()
    expect(errors).toEqual({})
    expect(values.membershipType).toBe("Individual")
    expect(values.policies).toBe("Yes")
    expect("organizationName" in values).toBe(false)
  })

  test("offers individual and organization memberships only", () => {
    const options = requestForms.join.fields.find(
      (field) => field.name === "membershipType",
    ).options
    expect(options.map((option) => option.value)).toEqual(["individual", "organization"])
    expect(apply({ membershipType: "joint" }).errors.membershipType).toBeDefined()
    expect(requestForms.join.fields.map((field) => field.name)).not.toContain("partnerName")
  })

  test("asks for the organization's name only for organizations", () => {
    expect(apply({ membershipType: "organization" }).errors.organizationName).toBeDefined()
    const given = apply({ membershipType: "organization", organizationName: "Analytical Engines" })
    expect(given.errors).toEqual({})
    expect(given.values.organizationName).toBe("Analytical Engines")
    const hidden = apply({ organizationName: "ignored" })
    expect("organizationName" in hidden.values).toBe(false)
  })

  test("requires the policies box to be ticked", () => {
    expect(apply({ policies: "" }).errors.policies).toBeDefined()
    expect(apply({ policies: "no" }).errors.policies).toBeDefined()
    const unticked = formOf(goodApplication)
    unticked.delete("policies")
    expect(validateRequest(requestForms.join, unticked).errors.policies).toBeDefined()
  })

  test("requires only the core fields", () => {
    const { errors } = validateRequest(requestForms.join, formOf({}))
    expect(Object.keys(errors).sort()).toEqual(
      ["email", "fullName", "membershipType", "policies", "postalAddress", "telephone"].sort(),
    )
  })

  test("checks the email addresses and the SSH key when given", () => {
    expect(apply({ email: "ada@@example.com" }).errors.email).toBeDefined()
    expect(apply({ googleEmail: "nope" }).errors.googleEmail).toBeDefined()
    expect(apply({ alternateEmail: "nope" }).errors.alternateEmail).toBeDefined()
    expect(apply({ sshKey: "hello" }).errors.sshKey).toBeDefined()
    expect(apply({ sshKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nabc" }).errors.sshKey).toContain(
      "private key",
    )
  })
})

describe("the membership application email", () => {
  test("is addressed to the applicant's reply-to and tagged", () => {
    const { values } = apply({ githubUsername: "ada" })
    const email = composeRequestEmail(requestForms.join, values, "membership@example.org")
    expect(email.to).toBe("membership@example.org")
    expect(email.replyTo).toBe("ada@example.com")
    expect(email.subject).toBe("[Membership application] Ada Lovelace")
    expect(email.text).toContain("Membership type: Individual")
    expect(email.text).toContain("GitHub username: ada")
    expect(email.text).toContain("Sent from the iocoop.org membership application form.")
    expect(email.text).not.toContain("WAITING LIST")
  })
})

describe("the join handler", () => {
  const env = {
    TURNSTILE_SECRET_KEY: "secret",
    CONTACT_FROM: "website@iocoop.org",
    CONTACT_TO: "fallback@example.org",
  }

  async function submit(fields, environment = env) {
    const delivered = []
    const handler = createRequestHandler("join", {
      fetchImpl: async () => new Response(JSON.stringify({ success: true })),
      deliverImpl: async (email) => delivered.push(email),
    })
    const request = new Request("https://iocoop.org/api/join", {
      method: "POST",
      body: formOf({ ...fields, "cf-turnstile-response": "token" }),
    })
    const response = await handler({ request, env: environment })
    return { response, body: await response.json(), delivered }
  }

  test("delivers a valid application", async () => {
    const { response, delivered } = await submit(goodApplication)
    expect(response.status).toBe(200)
    expect(delivered).toHaveLength(1)
    expect(delivered[0].to).toBe("fallback@example.org")
  })

  test("routes to JOIN_TO, then the general inbox, then the catch-all", async () => {
    const specific = {
      ...env,
      JOIN_TO: "join@example.org",
      CONTACT_TO_GENERAL: "general@example.org",
    }
    expect((await submit(goodApplication, specific)).delivered[0].to).toBe("join@example.org")
    const general = { ...env, CONTACT_TO_GENERAL: "general@example.org" }
    expect((await submit(goodApplication, general)).delivered[0].to).toBe("general@example.org")
  })

  test("rejects an incomplete application without leaking an address", async () => {
    const { response, body, delivered } = await submit({ ...goodApplication, policies: "" })
    expect(response.status).toBe(400)
    expect(body.fields.policies).toBeDefined()
    expect(JSON.stringify(body)).not.toContain("@")
    expect(delivered).toHaveLength(0)
  })

  test("drops honeypot submissions", async () => {
    const { response, delivered } = await submit({ ...goodApplication, website: "http://spam" })
    expect(response.status).toBe(200)
    expect(delivered).toHaveLength(0)
  })
})
