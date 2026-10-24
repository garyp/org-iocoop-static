import { composeContactEmail } from "./compose.js"
import { createFormHandler } from "./form-handler.js"
import { findPurpose, recipientFor } from "./routing.js"
import { validateSubmission } from "./validate.js"

// Builds the POST handler for /api/contact (see functions/api/contact.js).
export function createContactHandler(dependencies = {}) {
  return createFormHandler({
    label: "contact form",
    validate: validateSubmission,
    resolveRecipient(values, env) {
      const purpose = findPurpose(values.purpose)
      return {
        recipient: recipientFor(purpose, env),
        missing: `${purpose.recipientVariable} or CONTACT_TO`,
      }
    },
    compose: (values, recipient) =>
      composeContactEmail(values, findPurpose(values.purpose), recipient),
    ...dependencies,
  })
}
