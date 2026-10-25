// Sends a composed email through Amazon SES (see ses.js). To use a different provider, change
// `deliver` and keep its signature: it receives `{ to, replyTo, subject, text }`, already composed
// and addressed (see compose.js).
import { sendWithSes, sesIsConfigured } from "./ses.js"

export async function deliver(email, env) {
  if (!sesIsConfigured(env)) {
    throw new Error(
      "Amazon SES is not configured: set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_REGION",
    )
  }
  return sendWithSes(email, env)
}
