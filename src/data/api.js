// Where the forms post to: the django-iocoop member portal's public form API (iocoop/api in that
// repository). Both values are build-time public variables, set in `.env` locally and as
// repository variables in the GitHub Pages workflow (.github/workflows/deploy.yml).
//
// PUBLIC_API_URL is the API's root, such as https://members.iocoop.org/members/api. A production
// build without it fails rather than ship forms that post to localhost.
//
// PUBLIC_RECAPTCHA_SITE_KEY is the public half of the member portal's reCAPTCHA v2 keys; the
// portal holds the secret and verifies every token. A production build fails without it. In dev
// and preview, Google's published always-pass test key is used when it isn't set; the portal then
// rejects the token unless it is running with the matching test secret (see django-iocoop's dev
// settings).
const configuredApiUrl = import.meta.env.PUBLIC_API_URL
if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("PUBLIC_API_URL must be set for a production build (see .env.example).")
}

const root = (configuredApiUrl || "http://localhost:8000/members/api").replace(/\/+$/, "")

// The URL of one endpoint: apiUrl("contact") -> <root>/contact/
export const apiUrl = (endpoint) => `${root}/${endpoint}/`

const testSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
export const recaptchaSiteKey = import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY || testSiteKey
if (import.meta.env.PROD && recaptchaSiteKey === testSiteKey) {
  throw new Error(
    "PUBLIC_RECAPTCHA_SITE_KEY must be set for a production build (see .env.example).",
  )
}
