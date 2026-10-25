// Sends an email through Amazon SES (the v2 SendEmail API) over HTTPS. Pages Functions can't use
// the AWS SDK comfortably, so this signs the one request it needs with Signature Version 4 using
// WebCrypto. Configuration (Pages secrets and variables):
//
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY   credentials for an IAM user that may only call
//                                              ses:SendEmail (see the README)
//   AWS_REGION                                 the SES region, such as us-west-2
//   SES_CONFIGURATION_SET                      optional; for bounce and complaint tracking
//
// The sender (CONTACT_FROM) must be a verified identity in that region, and while the account is
// in the SES sandbox every recipient must be verified too.
const encoder = new TextEncoder()

const toHex = (buffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("")

async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)))
}

async function hmac(key, text) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(text))
}

// Signs a POST with AWS Signature Version 4 and returns the headers to send.
// https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
export async function signRequest({
  url,
  body,
  region,
  service,
  accessKeyId,
  secretAccessKey,
  now = new Date(),
}) {
  const { host, pathname } = new URL(url)
  const timestamp = now.toISOString().replace(/[:-]|\.\d{3}/g, "") // 20260101T000000Z
  const date = timestamp.slice(0, 8)
  const contentType = "application/json"

  const signedHeaders = "content-type;host;x-amz-date"
  const canonicalRequest = [
    "POST",
    pathname,
    "", // no query string
    `content-type:${contentType}\nhost:${host}\nx-amz-date:${timestamp}\n`,
    signedHeaders,
    await sha256Hex(body),
  ].join("\n")

  const scope = `${date}/${region}/${service}/aws4_request`
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n")

  let key = await hmac(encoder.encode(`AWS4${secretAccessKey}`), date)
  for (const part of [region, service, "aws4_request"]) key = await hmac(key, part)
  const signature = toHex(await hmac(key, stringToSign))

  return {
    "Content-Type": contentType,
    "X-Amz-Date": timestamp,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

export function sesIsConfigured(env) {
  return Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_REGION)
}

// The JSON body of SES's SendEmail call for an email from compose.js. SES encodes the subject and
// body itself, so none of the MIME work in deliver.js is needed.
export function buildSesPayload({ from, to, replyTo, subject, text }, configurationSet) {
  const shortSubject = subject.length > 150 ? `${subject.slice(0, 149)}…` : subject
  return {
    FromEmailAddress: `IO Cooperative Website <${from}>`,
    Destination: { ToAddresses: [to] },
    ReplyToAddresses: [replyTo],
    Content: {
      Simple: {
        Subject: { Data: shortSubject.replace(/[\r\n]+/g, " "), Charset: "UTF-8" },
        Body: { Text: { Data: text, Charset: "UTF-8" } },
      },
    },
    ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
  }
}

export async function sendWithSes(email, env, { fetchImpl = fetch, now } = {}) {
  const region = env.AWS_REGION
  const url = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`
  const body = JSON.stringify(
    buildSesPayload({ from: env.CONTACT_FROM, ...email }, env.SES_CONFIGURATION_SET),
  )
  const headers = await signRequest({
    url,
    body,
    region,
    service: "ses",
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    now,
  })
  const response = await fetchImpl(url, { method: "POST", headers, body })
  if (!response.ok) {
    // SES's error body names the problem (unverified identity, sandbox, throttling) and never
    // contains our credentials, so it is safe for the server log.
    throw new Error(`SES refused the message (${response.status}): ${await response.text()}`)
  }
}
