import { createHmac, createHash } from "node:crypto"
import { describe, expect, test } from "bun:test"
import { deliver } from "../functions/_lib/deliver.js"
import {
  buildSesPayload,
  sendWithSes,
  sesIsConfigured,
  signRequest,
} from "../functions/_lib/ses.js"

const env = {
  AWS_ACCESS_KEY_ID: "AKIDEXAMPLE",
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY",
  AWS_REGION: "us-west-2",
  CONTACT_FROM: "website@iocoop.org",
}
const email = {
  to: "inbox@example.org",
  replyTo: "ada@example.com",
  subject: "[Membership application] Zoë",
  text: "Hello",
}
const now = new Date("2026-10-24T12:34:56.789Z")

describe("signing", () => {
  test("matches an independent SigV4 computation", async () => {
    const url = "https://email.us-west-2.amazonaws.com/v2/email/outbound-emails"
    const body = '{"a":1}'
    const headers = await signRequest({
      url,
      body,
      region: "us-west-2",
      service: "ses",
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      now,
    })

    const hash = (text) => createHash("sha256").update(text).digest("hex")
    const sign = (key, text) => createHmac("sha256", key).update(text).digest()
    const canonical = [
      "POST",
      "/v2/email/outbound-emails",
      "",
      "content-type:application/json\nhost:email.us-west-2.amazonaws.com\nx-amz-date:20261024T123456Z\n",
      "content-type;host;x-amz-date",
      hash(body),
    ].join("\n")
    const scope = "20261024/us-west-2/ses/aws4_request"
    const stringToSign = ["AWS4-HMAC-SHA256", "20261024T123456Z", scope, hash(canonical)].join("\n")
    let key = sign(`AWS4${env.AWS_SECRET_ACCESS_KEY}`, "20261024")
    for (const part of ["us-west-2", "ses", "aws4_request"]) key = sign(key, part)
    const signature = createHmac("sha256", key).update(stringToSign).digest("hex")

    expect(headers["X-Amz-Date"]).toBe("20261024T123456Z")
    expect(headers.Authorization).toBe(
      `AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/${scope}, SignedHeaders=content-type;host;x-amz-date, Signature=${signature}`,
    )
  })
})

describe("sending through SES", () => {
  test("posts the message to the regional endpoint, signed", async () => {
    const calls = []
    await sendWithSes(email, env, {
      now,
      fetchImpl: async (url, init) => {
        calls.push({ url, init })
        return new Response("{}")
      },
    })
    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe("https://email.us-west-2.amazonaws.com/v2/email/outbound-emails")
    expect(calls[0].init.headers.Authorization).toContain(
      "Credential=AKIDEXAMPLE/20261024/us-west-2/ses",
    )
    const payload = JSON.parse(calls[0].init.body)
    expect(payload.Destination.ToAddresses).toEqual(["inbox@example.org"])
    expect(payload.ReplyToAddresses).toEqual(["ada@example.com"])
    expect(payload.FromEmailAddress).toContain("<website@iocoop.org>")
    expect(payload.Content.Simple.Subject.Data).toBe("[Membership application] Zoë")
    expect(payload.ConfigurationSetName).toBeUndefined()
  })

  test("includes the configuration set when one is named", () => {
    expect(buildSesPayload({ from: "a@b.org", ...email }, "tracking").ConfigurationSetName).toBe(
      "tracking",
    )
  })

  test("throws with SES's explanation, but never the secret key", async () => {
    const failing = sendWithSes(email, env, {
      now,
      fetchImpl: async () =>
        new Response('{"message":"Email address is not verified."}', { status: 400 }),
    })
    await expect(failing).rejects.toThrow("not verified")
    await failing.catch((error) => expect(error.message).not.toContain(env.AWS_SECRET_ACCESS_KEY))
  })

  test("deliver complains when SES isn't configured", async () => {
    expect(sesIsConfigured(env)).toBe(true)
    expect(sesIsConfigured({ ...env, AWS_REGION: "" })).toBe(false)
    await expect(deliver(email, { CONTACT_FROM: env.CONTACT_FROM })).rejects.toThrow(
      "Amazon SES is not configured",
    )
  })
})
