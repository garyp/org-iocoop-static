import { deliver } from "./deliver.js"
import { verifyTurnstile } from "./turnstile.js"

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

const unavailable = {
  ok: false,
  error: "This form isn't available right now. Please try again later.",
}

// The pipeline shared by every form on the site: configuration check, size limit, honeypot,
// validation, routing, Turnstile verification, then delivery. Each form supplies:
//
//   validate(formData)        -> { values, errors }
//   resolveRecipient(values, env) -> { recipient, missing } (`missing` names what to configure)
//   compose(values, recipient)    -> the email to send ({ to, replyTo, subject, text })
//
// The network calls are parameters so the tests can replace them. Error messages never contain an
// email address: the site deliberately doesn't publish one.
export function createFormHandler({
  label,
  validate,
  resolveRecipient,
  compose,
  maxRequestBytes = 20_000,
  fetchImpl = fetch,
  deliverImpl = deliver,
}) {
  return async function handleForm({ request, env }) {
    if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_FROM) {
      console.error(`${label}: TURNSTILE_SECRET_KEY and CONTACT_FROM must be set`)
      return respond(unavailable, 503)
    }

    if (Number(request.headers.get("Content-Length") ?? 0) > maxRequestBytes) {
      return respond({ ok: false, error: "That submission is too large." }, 413)
    }

    let formData
    try {
      formData = await request.formData()
    } catch {
      return respond({ ok: false, error: "That request couldn't be read." }, 400)
    }

    // A field real visitors never see. Bots fill it in; pretend it worked and send nothing.
    if (formData.get("website")) return respond({ ok: true })

    const { values, errors } = validate(formData)
    if (Object.keys(errors).length > 0) {
      return respond(
        { ok: false, error: "Please check the highlighted fields.", fields: errors },
        400,
      )
    }

    const { recipient, missing } = resolveRecipient(values, env)
    if (!recipient) {
      console.error(`${label}: no recipient configured; set ${missing}`)
      return respond(unavailable, 503)
    }

    const token = formData.get("cf-turnstile-response")
    if (!token) {
      return respond({ ok: false, error: "Please wait for the verification check to finish." }, 400)
    }

    let verification
    try {
      verification = await verifyTurnstile({
        token: String(token),
        secret: env.TURNSTILE_SECRET_KEY,
        ip: request.headers.get("CF-Connecting-IP"),
        fetchImpl,
      })
    } catch (error) {
      console.error(`${label}: Turnstile verification request failed`, error)
      return respond(
        { ok: false, error: "We couldn't verify you right now. Please try again." },
        503,
      )
    }
    if (!verification.success) {
      console.warn(`${label}: Turnstile rejected a token`, verification.errorCodes)
      return respond({ ok: false, error: "The verification check failed. Please try again." }, 400)
    }

    try {
      await deliverImpl(compose(values, recipient), env)
    } catch (error) {
      console.error(`${label}: delivery failed`, error)
      return respond(
        { ok: false, error: "We couldn't send your message. Please try again in a few minutes." },
        502,
      )
    }
    return respond({ ok: true })
  }
}
