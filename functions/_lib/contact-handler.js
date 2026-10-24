import { deliver } from "./deliver.js"
import { findPurpose, recipientFor } from "./routing.js"
import { verifyTurnstile } from "./turnstile.js"
import { validateSubmission } from "./validate.js"

const maxRequestBytes = 20_000

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  })
}

// Builds the POST handler for /api/contact. The collaborators are parameters so the tests can
// replace the network calls.
export function createContactHandler({ fetchImpl = fetch, deliverImpl = deliver } = {}) {
  return async function handleContact({ request, env }) {
    if (!env.TURNSTILE_SECRET_KEY || !env.CONTACT_FROM) {
      console.error("contact form: TURNSTILE_SECRET_KEY and CONTACT_FROM must be set")
      return respond(
        { ok: false, error: "The contact form isn't available right now. Please try again later." },
        503,
      )
    }

    if (Number(request.headers.get("Content-Length") ?? 0) > maxRequestBytes) {
      return respond({ ok: false, error: "That message is too large." }, 413)
    }

    let formData
    try {
      formData = await request.formData()
    } catch {
      return respond({ ok: false, error: "That request couldn't be read." }, 400)
    }

    // A field real visitors never see. Bots fill it in; pretend it worked and send nothing.
    if (formData.get("website")) return respond({ ok: true })

    const { values, errors } = validateSubmission(formData)
    if (Object.keys(errors).length > 0) {
      return respond(
        { ok: false, error: "Please check the highlighted fields.", fields: errors },
        400,
      )
    }

    const purpose = findPurpose(values.purpose)
    const recipient = recipientFor(purpose, env)
    if (!recipient) {
      console.error(
        `contact form: no recipient for "${purpose.value}"; set ${purpose.recipientVariable} or CONTACT_TO`,
      )
      return respond(
        { ok: false, error: "The contact form isn't available right now. Please try again later." },
        503,
      )
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
      console.error("contact form: Turnstile verification request failed", error)
      return respond(
        { ok: false, error: "We couldn't verify you right now. Please try again." },
        503,
      )
    }
    if (!verification.success) {
      console.warn("contact form: Turnstile rejected a token", verification.errorCodes)
      return respond({ ok: false, error: "The verification check failed. Please try again." }, 400)
    }

    try {
      await deliverImpl({ ...values, purposeLabel: purpose.label, recipient }, env)
    } catch (error) {
      console.error("contact form: delivery failed", error)
      return respond(
        { ok: false, error: "We couldn't send your message. Please try again in a few minutes." },
        502,
      )
    }
    return respond({ ok: true })
  }
}
