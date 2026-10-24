import { requestForms } from "../../src/data/request-forms.js"
import { composeRequestEmail } from "./compose.js"
import { createFormHandler } from "./form-handler.js"
import { firstConfigured } from "./routing.js"
import { validateRequest } from "./validate-request.js"

// Builds the POST handler for a request form: "vps" or "colocation" (see functions/api/).
export function createRequestHandler(kind, dependencies = {}) {
  const form = requestForms[kind]
  if (!form) throw new Error(`No request form named "${kind}"`)

  return createFormHandler({
    label: `${kind} request form`,
    validate: (formData) => validateRequest(form, formData),
    resolveRecipient: (_values, env) => ({
      recipient: firstConfigured(form.recipientVariables, env),
      missing: `one of ${form.recipientVariables.join(", ")}`,
    }),
    compose: (values, recipient) => composeRequestEmail(form, values, recipient),
    maxRequestBytes: 40_000, // the SSH keys and three free-text fields can run to several KB
    ...dependencies,
  })
}
