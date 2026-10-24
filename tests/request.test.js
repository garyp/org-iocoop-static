import { describe, expect, test } from "bun:test"
import { requestForms } from "../src/data/request-forms.js"
import { composeRequestEmail } from "../functions/_lib/compose.js"
import { createRequestHandler } from "../functions/_lib/request-handler.js"
import { validateRequest } from "../functions/_lib/validate-request.js"

// A key with the real wire structure: a length-prefixed type name, then some key material.
function makeKey(type, comment, materialBytes = 32) {
  const name = new TextEncoder().encode(type)
  const bytes = new Uint8Array(4 + name.length + 4 + materialBytes).fill(7)
  new DataView(bytes.buffer).setUint32(0, name.length)
  bytes.set(name, 4)
  return `${type} ${Buffer.from(bytes).toString("base64")} ${comment}`
}

const ed25519Key = makeKey("ssh-ed25519", "ada@laptop")
const rsaKey = makeKey("ssh-rsa", "ada@desktop", 270)

function formOf(fields) {
  const formData = new FormData()
  for (const [field, value] of Object.entries(fields)) formData.append(field, value)
  return formData
}

const goodVps = {
  memberEmail: "ada@example.com",
  contactName: "Ada Lovelace",
  contactPhone: "+1 (415) 555-0100",
  mailingAddress: "12 Analytical Way\nSan Francisco, CA 94115",
  organization: "",
  extraContacts: "",
  hostname: "Myhost.Example.com",
  slices: "2",
  extraDisk: "1",
  os: "ubuntu-26.04",
  sshKey: ed25519Key,
  comments: "",
}

const goodColocation = {
  memberEmail: "ada@example.com",
  hostname: "rack1.example.com",
  brandModel: "Dell PowerEdge R340",
  height: "1",
  depth: "26.5",
  watts: "120",
  powerSupplies: "2",
  socketOrientation: "each-side",
  bandwidth: "50",
  ipv4: "1",
  publicPorts: "1",
  privatePorts: "1",
  comments: "",
}

const vps = (overrides = {}) =>
  validateRequest(requestForms.vps, formOf({ ...goodVps, ...overrides }))
const colocation = (overrides = {}) =>
  validateRequest(requestForms.colocation, formOf({ ...goodColocation, ...overrides }))

describe("request form definitions", () => {
  for (const [kind, form] of Object.entries(requestForms)) {
    test(`${kind}: field names are unique and the email fields exist`, () => {
      const names = form.fields.map((field) => field.name)
      expect(new Set(names).size).toBe(names.length)
      expect(names).toContain(form.subjectField)
      expect(names).toContain(form.replyToField)
    })

    test(`${kind}: defaults are valid options and conditions point at earlier fields`, () => {
      const seen = new Set()
      for (const field of form.fields) {
        if (field.type === "select" && field.defaultValue !== undefined) {
          expect(field.options.map((option) => option.value)).toContain(field.defaultValue)
        }
        if (field.showWhen) expect(seen.has(field.showWhen.field)).toBe(true)
        seen.add(field.name)
      }
    })

    test(`${kind}: says whether its service is available, and names it`, () => {
      expect(typeof form.available).toBe("boolean")
      expect(form.serviceName.length).toBeGreaterThan(0)
    })

    test(`${kind}: names a recipient chain`, () => {
      expect(form.recipientVariables.length).toBeGreaterThan(0)
    })
  }
})

describe("validating a VPS request", () => {
  test("accepts a complete request and reports select values by label", () => {
    const { values, errors } = vps()
    expect(errors).toEqual({})
    expect(values.slices).toBe("2")
    expect(values.extraDisk).toBe("1 × 25 GB")
    expect(values.os).toBe("Ubuntu 26.04 LTS (Resolute)")
    expect(values.hostname).toBe("myhost.example.com")
  })

  test("requires the fields that are required, and only those", () => {
    const { errors } = validateRequest(requestForms.vps, formOf({}))
    const expected = requestForms.vps.fields
      .filter((field) => field.required && !field.showWhen)
      .map((field) => field.name)
    expect(Object.keys(errors).sort()).toEqual(expected.sort())
  })

  test("offers the current Ubuntu LTS and Debian releases, and refuses retired ones", () => {
    for (const os of ["ubuntu-26.04", "ubuntu-24.04", "debian-13", "debian-12", "other"]) {
      expect(vps({ os, osOther: "Rocky Linux 9" }).errors.os).toBeUndefined()
    }
    for (const os of [
      "ubuntu-22.04",
      "ubuntu-20.04",
      "ubuntu-18.04",
      "debian-11",
      "ubuntu-26.10",
    ]) {
      expect(vps({ os }).errors.os).toBeDefined()
    }
  })

  test("checks hostnames are fully qualified", () => {
    for (const hostname of [
      "localhost",
      "my host.example.com",
      "-bad.example.com",
      "a..b.com",
      "example.123",
    ]) {
      expect(vps({ hostname }).errors.hostname).toBeDefined()
    }
    expect(vps({ hostname: "xn--caf-dma.example.com" }).errors.hostname).toBeUndefined()
  })

  test("checks the phone number and member email", () => {
    expect(vps({ contactPhone: "call me" }).errors.contactPhone).toBeDefined()
    expect(vps({ contactPhone: "12" }).errors.contactPhone).toBeDefined()
    expect(vps({ memberEmail: "ada@@example.com" }).errors.memberEmail).toBeDefined()
  })

  test("only accepts the listed options", () => {
    expect(vps({ slices: "9" }).errors.slices).toBeDefined()
    expect(vps({ slices: "0" }).errors.slices).toBeDefined()
    expect(vps({ os: "templeos" }).errors.os).toBeDefined()
    expect(vps({ extraDisk: "lots" }).errors.extraDisk).toBeDefined()
  })

  test("extra disk can't exceed the number of slices", () => {
    expect(vps({ slices: "2", extraDisk: "3" }).errors.extraDisk).toBeDefined()
    expect(vps({ slices: "2", extraDisk: "2" }).errors.extraDisk).toBeUndefined()
    expect(vps({ slices: "1", extraDisk: "0" }).errors.extraDisk).toBeUndefined()
  })

  test("asks which operating system only when 'Other' is chosen", () => {
    const missing = vps({ os: "other", osOther: "" })
    expect(missing.errors.osOther).toBeDefined()
    const given = vps({ os: "other", osOther: "Rocky Linux 9" })
    expect(given.errors).toEqual({})
    expect(given.values.osOther).toBe("Rocky Linux 9")
    const hidden = vps({ os: "debian-13", osOther: "ignored <script>" })
    expect(hidden.errors).toEqual({})
    expect("osOther" in hidden.values).toBe(false)
  })

  describe("SSH keys", () => {
    test("accepts public keys, comments, and several keys", () => {
      expect(vps({ sshKey: ed25519Key }).errors.sshKey).toBeUndefined()
      expect(vps({ sshKey: rsaKey }).errors.sshKey).toBeUndefined()
      expect(vps({ sshKey: `${ed25519Key}\n\n${rsaKey}\n` }).values.sshKey).toBe(
        `${ed25519Key}\n${rsaKey}`,
      )
    })

    test("refuses a pasted private key, whatever else is in the box", () => {
      const privateKey =
        "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA\n-----END OPENSSH PRIVATE KEY-----"
      expect(vps({ sshKey: privateKey }).errors.sshKey).toContain("private key")
      expect(vps({ sshKey: `${ed25519Key}\n${privateKey}` }).errors.sshKey).toContain("private key")
    })

    test("refuses things that aren't keys", () => {
      const wrongType = ed25519Key.replace("ssh-ed25519 ", "ssh-rsa ")
      for (const sshKey of [
        "hello",
        "ssh-ed25519",
        "ssh-ed25519 not base64!!",
        "ssh-ed25519 abc",
        wrongType,
        "ssh-foo AAAA",
        "https://example.com/key",
      ]) {
        expect(vps({ sshKey }).errors.sshKey).toBeDefined()
      }
    })

    test("limits how many keys and how much text", () => {
      expect(vps({ sshKey: Array(11).fill(ed25519Key).join("\n") }).errors.sshKey).toBeDefined()
      expect(vps({ sshKey: makeKey("ssh-rsa", "big", 6000) }).errors.sshKey).toBeDefined()
    })
  })

  test("keeps the line structure of the address but flattens single-line fields", () => {
    const { values } = vps({ contactName: "Ada\r\nBcc: x@example.com" })
    expect(values.contactName).not.toMatch(/[\r\n]/)
    expect(values.mailingAddress).toContain("\n")
  })

  test("enforces text length limits", () => {
    expect(vps({ contactName: "x".repeat(401) }).errors.contactName).toBeDefined()
    expect(vps({ comments: "x".repeat(2001) }).errors.comments).toBeDefined()
  })
})

describe("validating a colocation request", () => {
  test("accepts a complete request", () => {
    const { values, errors } = colocation()
    expect(errors).toEqual({})
    expect(values.height).toBe("1U")
    expect(values.socketOrientation).toBe("One on each side")
    expect(values.depth).toBe("26.5")
  })

  test("the server must be less than 28.75 inches deep", () => {
    expect(colocation({ depth: "28.7" }).errors.depth).toBeUndefined()
    expect(colocation({ depth: "28.75" }).errors.depth).toBeDefined()
    expect(colocation({ depth: "40" }).errors.depth).toBeDefined()
    expect(colocation({ depth: "0" }).errors.depth).toBeDefined()
  })

  test("numbers must be numbers, whole where they should be, and in range", () => {
    expect(colocation({ watts: "abc" }).errors.watts).toBeDefined()
    expect(colocation({ watts: "120.5" }).errors.watts).toBeDefined()
    expect(colocation({ watts: "0" }).errors.watts).toBeDefined()
    expect(colocation({ watts: "3001" }).errors.watts).toBeDefined()
    expect(colocation({ bandwidth: "-1" }).errors.bandwidth).toBeDefined()
    expect(colocation({ publicPorts: "5" }).errors.publicPorts).toBeDefined()
    expect(colocation({ powerSupplies: "9" }).errors.powerSupplies).toBeDefined()
    expect(colocation({ bandwidth: "0" }).errors.bandwidth).toBeUndefined()
  })

  test("more than one IPv4 address needs a written justification", () => {
    expect(colocation({ ipv4: "2" }).errors.ipv4Justification).toBeDefined()
    const justified = colocation({
      ipv4: "2",
      ipv4Justification: "Two virtual hosts on separate networks.",
    })
    expect(justified.errors).toEqual({})
    expect(justified.values.ipv4Justification).toContain("separate networks")
  })

  test("ignores the justification when one address or none is asked for", () => {
    for (const ipv4 of ["0", "1"]) {
      const { values, errors } = colocation({ ipv4, ipv4Justification: "not needed" })
      expect(errors).toEqual({})
      expect("ipv4Justification" in values).toBe(false)
    }
  })

  test("rejects an orientation or height that isn't offered", () => {
    expect(colocation({ socketOrientation: "upside-down" }).errors.socketOrientation).toBeDefined()
    expect(colocation({ height: "9" }).errors.height).toBeDefined()
  })
})

describe("composeRequestEmail", () => {
  test("addresses the request and lays out the sections", () => {
    const { values } = vps({ sshKey: `${ed25519Key}\n${rsaKey}` })
    const email = composeRequestEmail(requestForms.vps, values, "ops@example.org")
    expect(email.to).toBe("ops@example.org")
    expect(email.replyTo).toBe("ada@example.com")
    expect(email.subject).toBe("[VPS request] myhost.example.com")
    for (const heading of ["About you", "Your VPS", "Anything else"])
      expect(email.text).toContain(heading)
    expect(email.text).toContain("Operating system: Ubuntu 26.04 LTS (Resolute)")
    expect(email.text).toContain("Organization: (none)")
    // multi-line values are indented under their label
    expect(email.text).toContain("Mailing address:\n  12 Analytical Way\n  San Francisco, CA 94115")
    expect(email.text).toContain(`SSH public key:\n  ${ed25519Key}\n  ${rsaKey}`)
  })

  test("appends units and leaves out fields that weren't shown", () => {
    const { values } = colocation()
    const form = { ...requestForms.colocation, available: true }
    const email = composeRequestEmail(form, values, "ops@example.org")
    expect(email.subject).toBe("[Colocation request] rack1.example.com")
    expect(email.text).toContain("Power consumption: 120 W")
    expect(email.text).toContain("Server depth: 26.5 inches")
    expect(email.text).toContain("Bandwidth: 50 Mbps")
    expect(email.text).not.toContain("Why do you need more than one IPv4")
  })

  describe("when the service is unavailable", () => {
    const unavailable = { ...requestForms.colocation, available: false }
    const available = { ...requestForms.colocation, available: true }

    test("tags the subject and says so at the top of the email", () => {
      const { values } = colocation()
      const email = composeRequestEmail(unavailable, values, "ops@example.org")
      expect(email.subject).toBe("[Colocation request: waiting list] rack1.example.com")
      expect(email.text).toContain(
        "WAITING LIST: Colocation was not available when this request was submitted.",
      )
      expect(email.text.indexOf("WAITING LIST")).toBeLessThan(email.text.indexOf("About you"))
    })

    test("leaves ordinary requests untagged", () => {
      const { values } = colocation()
      const email = composeRequestEmail(available, values, "ops@example.org")
      expect(email.subject).not.toContain("waiting list")
      expect(email.text).not.toContain("WAITING LIST")
    })

    test("applies to a VPS request in the same way", () => {
      const { values } = vps()
      const email = composeRequestEmail(
        { ...requestForms.vps, available: false },
        values,
        "ops@example.org",
      )
      expect(email.subject).toBe("[VPS request: waiting list] myhost.example.com")
      expect(email.text).toContain("WAITING LIST: VPS was not available")
    })
  })
})

describe("request handlers", () => {
  const env = {
    TURNSTILE_SECRET_KEY: "secret",
    CONTACT_FROM: "website@iocoop.org",
    CONTACT_TO: "fallback@example.org",
  }

  async function submit(kind, fields, { environment = env, turnstile = { success: true } } = {}) {
    const delivered = []
    const handler = createRequestHandler(kind, {
      fetchImpl: async () => new Response(JSON.stringify(turnstile)),
      deliverImpl: async (email) => delivered.push(email),
    })
    const request = new Request(`https://iocoop.org/api/request-${kind}`, {
      method: "POST",
      body: formOf({ ...fields, "cf-turnstile-response": "token" }),
    })
    const response = await handler({ request, env: environment })
    return { response, body: await response.json(), delivered }
  }

  test("delivers a valid VPS request", async () => {
    const { response, delivered } = await submit("vps", goodVps)
    expect(response.status).toBe(200)
    expect(delivered).toHaveLength(1)
    expect(delivered[0].subject).toMatch(/^\[VPS request(: waiting list)?\] myhost\.example\.com$/)
  })

  test("delivers a valid colocation request", async () => {
    const { response, delivered } = await submit("colocation", goodColocation)
    expect(response.status).toBe(200)
    expect(delivered[0].subject).toMatch(
      /^\[Colocation request(: waiting list)?\] rack1\.example\.com$/,
    )
  })

  test("routes to the request inbox, then the technical inbox, then the catch-all", async () => {
    const specific = {
      ...env,
      REQUEST_TO_VPS: "vps@example.org",
      CONTACT_TO_TECHNICAL: "tech@example.org",
    }
    expect((await submit("vps", goodVps, { environment: specific })).delivered[0].to).toBe(
      "vps@example.org",
    )
    const technical = { ...env, CONTACT_TO_TECHNICAL: "tech@example.org" }
    expect((await submit("vps", goodVps, { environment: technical })).delivered[0].to).toBe(
      "tech@example.org",
    )
    expect((await submit("vps", goodVps)).delivered[0].to).toBe("fallback@example.org")
    const colo = {
      ...env,
      REQUEST_TO_COLOCATION: "colo@example.org",
      REQUEST_TO_VPS: "vps@example.org",
    }
    expect(
      (await submit("colocation", goodColocation, { environment: colo })).delivered[0].to,
    ).toBe("colo@example.org")
  })

  test("reports a missing inbox without delivering or revealing anything", async () => {
    const { response, body, delivered } = await submit("vps", goodVps, {
      environment: { ...env, CONTACT_TO: undefined },
    })
    expect(response.status).toBe(503)
    expect(body.error).not.toContain("@")
    expect(delivered).toHaveLength(0)
  })

  test("returns per-field errors and delivers nothing for an invalid request", async () => {
    const { response, body, delivered } = await submit("vps", {
      ...goodVps,
      hostname: "nope",
      sshKey: "",
    })
    expect(response.status).toBe(400)
    expect(Object.keys(body.fields).sort()).toEqual(["hostname", "sshKey"])
    expect(delivered).toHaveLength(0)
  })

  test("refuses a pasted private key without echoing it back", async () => {
    const privateKey =
      "-----BEGIN OPENSSH PRIVATE KEY-----\nsecretsecret\n-----END OPENSSH PRIVATE KEY-----"
    const { response, body, delivered } = await submit("vps", { ...goodVps, sshKey: privateKey })
    expect(response.status).toBe(400)
    expect(JSON.stringify(body)).not.toContain("secretsecret")
    expect(delivered).toHaveLength(0)
  })

  test("still requires a Turnstile pass", async () => {
    const { response, delivered } = await submit("colocation", goodColocation, {
      turnstile: { success: false },
    })
    expect(response.status).toBe(400)
    expect(delivered).toHaveLength(0)
  })

  test("drops honeypot submissions", async () => {
    const { response, delivered } = await submit("vps", {
      ...goodVps,
      website: "http://spam.example",
    })
    expect(response.status).toBe(200)
    expect(delivered).toHaveLength(0)
  })

  test("refuses an unknown form", () => {
    expect(() => createRequestHandler("mainframe")).toThrow()
  })
})
