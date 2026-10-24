// Server-side check of a Cloudflare Turnstile token. The widget alone proves nothing: anyone can
// post to the form endpoint directly, so the token has to be verified with the secret key.
const siteverifyUrl = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstile({ token, secret, ip, fetchImpl = fetch }) {
  const body = new FormData()
  body.append("secret", secret)
  body.append("response", token)
  if (ip) body.append("remoteip", ip)

  const response = await fetchImpl(siteverifyUrl, { method: "POST", body })
  const outcome = await response.json()
  return { success: outcome.success === true, errorCodes: outcome["error-codes"] ?? [] }
}
