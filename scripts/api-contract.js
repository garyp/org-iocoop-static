// Compares the forms this site builds with django-iocoop's OpenAPI schema (the contract), so a
// drift in field names, options or limits is caught here instead of as a validation error a visitor
// sees. The pure comparison lives here so the tests can use it; check-api.js runs it on dist/.

// The controls the page has that the API doesn't know: the honeypot, the waiting-list flag, and
// the captcha (Google's widget adds its own field when it renders).
const notFormFields = new Set(["website", "waiting_list", "g-recaptcha-response", "captcha"])

// Follows a $ref (or the allOf wrapper DRF's schema generator puts around one) to the definition.
export function resolve(schema, property) {
  let current = property
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current.$ref) {
      current = current.$ref
        .replace("#/", "")
        .split("/")
        .reduce((node, key) => node?.[key], schema)
    } else if (current.allOf?.length === 1) current = current.allOf[0]
    else break
  }
  return current ?? {}
}

// `controls` is { name: { required, disabled, maxlength, min, max, options: [value] | undefined } }
// as read from the page's markup; `requestSchema` is the resolved request body schema. Returns a
// list of problems (empty when the form agrees with the API).
export function compareForm(schema, requestSchema, controls) {
  const problems = []
  const properties = requestSchema.properties ?? {}
  const required = new Set(requestSchema.required ?? [])

  for (const name of Object.keys(properties)) {
    if (!notFormFields.has(name) && !(name in controls)) {
      problems.push(`the API takes "${name}" but the form has no control for it`)
    }
  }

  for (const [name, control] of Object.entries(controls)) {
    if (notFormFields.has(name)) continue
    const property = properties[name]
    if (!property) {
      problems.push(`the form sends "${name}" but the API doesn't know it`)
      continue
    }
    const definition = resolve(schema, property)

    // A field the API requires must be required on the page. A field the page requires but the API
    // doesn't must be one that starts hidden (a conditional field, which is disabled until shown).
    if (required.has(name) && !control.required) {
      problems.push(`"${name}" is required by the API but not on the form`)
    }
    if (!required.has(name) && control.required && !control.disabled) {
      problems.push(`"${name}" is required on the form but optional in the API`)
    }

    if (definition.enum) {
      const allowed = definition.enum.filter((value) => value !== "")
      const offered = control.options ?? []
      const missing = allowed.filter((value) => !offered.includes(value))
      const extra = offered.filter((value) => !allowed.includes(value))
      if (missing.length > 0) problems.push(`"${name}" doesn't offer: ${missing.join(", ")}`)
      if (extra.length > 0)
        problems.push(`"${name}" offers values the API rejects: ${extra.join(", ")}`)
    } else if (control.options) {
      problems.push(`"${name}" is a menu on the form but the API doesn't limit its values`)
    }

    if (definition.maxLength !== undefined) {
      if (control.maxlength === undefined || control.maxlength > definition.maxLength) {
        problems.push(
          `"${name}" should have maxlength ${definition.maxLength} or less (has ${control.maxlength ?? "none"})`,
        )
      }
    }
    for (const [attribute, limit] of [
      ["min", definition.minimum],
      ["max", definition.maximum],
    ]) {
      if (limit !== undefined && Number(control[attribute]) !== Number(limit)) {
        problems.push(
          `"${name}" ${attribute} is ${control[attribute] ?? "missing"}, the API says ${limit}`,
        )
      }
    }
  }
  return problems
}

// Reads the named controls of the form whose action ends with `/${resource}/` from built HTML.
export async function readControls(html, resource) {
  const controls = {}
  let inForm = false
  let select = null
  const rewriter = new HTMLRewriter()
    .on("form[data-enhance-form]", {
      element(form) {
        inForm = (form.getAttribute("action") ?? "").endsWith(`/${resource}/`)
        form.onEndTag(() => {
          inForm = false
        })
      },
    })
    .on("input, select, textarea", {
      element(control) {
        const name = control.getAttribute("name")
        if (!inForm || !name) return
        const number = (attribute) => {
          const value = control.getAttribute(attribute)
          return value === null ? undefined : Number(value)
        }
        controls[name] = {
          required: control.hasAttribute("required"),
          disabled: control.hasAttribute("disabled"),
          maxlength: number("maxlength"),
          min: number("min"),
          max: number("max"),
          options: control.tagName === "select" ? [] : undefined,
        }
        select = control.tagName === "select" ? name : null
      },
    })
    .on("option", {
      element(option) {
        if (inForm && select) controls[select].options.push(option.getAttribute("value") ?? "")
      },
    })
  await rewriter.transform(new Response(html)).text()
  return controls
}

// Where the site's forms are, and the API resource each posts to.
export const forms = [
  { page: "contact/index.html", resource: "contact-messages" },
  { page: "services/virtual-private-servers/index.html", resource: "vps-requests" },
  { page: "services/colocation/index.html", resource: "colocation-requests" },
  { page: "join/index.html", resource: "membership-applications" },
]

export function requestSchemaFor(schema, resource) {
  const path = Object.keys(schema.paths).find((candidate) => candidate.endsWith(`/${resource}/`))
  const body = schema.paths[path]?.post?.requestBody?.content?.["application/json"]?.schema
  return body ? resolve(schema, body) : null
}
