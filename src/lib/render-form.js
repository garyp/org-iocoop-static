// Turns a form description from django-iocoop (GET <resource>/form/) into the markup of its
// fields. Pure string building so it can be tested without a browser; everything from the API is
// escaped before it goes into the page, and link targets are limited to http(s) and site paths.
//
// The description is { title, sections: [{ title, fields: [field] }] }. A field has name, label,
// type (text, email, tel, hostname, number, select, textarea, sshkeys, checkbox), required, and
// optionally help_text, help_links [{label, href}], placeholder, autocomplete, max_length, min,
// max, decimal, unit, rows, half, initial, choices [{value, label}], show_when
// ({field, equals} or {field, more_than}) and checkbox_label.

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

const safeHref = (href) => (/^(https?:\/\/|\/(?!\/))/.test(String(href)) ? String(href) : null)

const hints = {
  email: "Please enter a valid email address.",
  tel: "Please enter a phone number.",
  hostname: "Please enter a fully qualified hostname, like myhost.example.com.",
}

function hintFor(field) {
  if (field.type === "number") {
    const limits = []
    if (field.min !== undefined) limits.push(`at least ${field.min}`)
    if (field.max !== undefined) limits.push(`at most ${field.max}`)
    return limits.length > 0
      ? `Please enter a number: ${limits.join(", ")}.`
      : "Please enter a number."
  }
  return hints[field.type] ?? "Please fill this in."
}

// Attributes as a string, skipping the ones that are undefined or false. `true` writes the bare
// attribute.
function attributes(map) {
  return Object.entries(map)
    .filter(([, value]) => value !== undefined && value !== false && value !== null)
    .map(([name, value]) => (value === true ? name : `${name}="${escapeHtml(value)}"`))
    .join(" ")
}

function control(field, id, describedBy, form) {
  const conditional = Boolean(field.show_when)
  const common = {
    id,
    name: field.name,
    required: field.required,
    disabled: conditional,
    "aria-describedby": describedBy,
  }

  switch (field.type) {
    case "checkbox":
      return `<label class="flex cursor-pointer items-start gap-3 text-base">
        <input ${attributes({ ...common, type: "checkbox", value: "yes", class: "checkbox mt-0.5" })} />
        <span>${escapeHtml(field.checkbox_label ?? field.label)}</span>
      </label>`

    case "select":
      return `<select ${attributes({ ...common, class: "select w-full text-base" })}>${field.choices
        .map(
          (choice) =>
            `<option ${attributes({ value: choice.value, selected: choice.value === field.initial })}>${escapeHtml(choice.label)}</option>`,
        )
        .join("")}</select>`

    case "number":
      return `<label class="input w-full${field.required ? " validator" : ""}">
        <input ${attributes({
          ...common,
          type: "number",
          inputmode: field.decimal ? "decimal" : "numeric",
          min: field.min,
          max: field.max,
          step: field.decimal ? "any" : "1",
          value: field.initial,
          class: "grow text-base",
        })} />
        ${field.unit ? `<span class="label text-base-content/75">${escapeHtml(field.unit)}</span>` : ""}
      </label>`

    case "textarea":
      return `<textarea ${attributes({
        ...common,
        rows: field.rows ?? 4,
        maxlength: field.max_length,
        placeholder: field.placeholder,
        autocomplete: field.autocomplete,
        class: "textarea min-h-24 w-full text-base",
      })}></textarea>`

    case "sshkeys":
      return `<textarea ${attributes({
        ...common,
        rows: field.rows ?? 4,
        maxlength: field.max_length,
        placeholder: "ssh-ed25519 AAAA… you@host",
        autocomplete: "off",
        autocapitalize: "none",
        spellcheck: "false",
        class: "textarea min-h-24 w-full font-mono text-sm",
      })}></textarea>`

    default:
      return `<input ${attributes({
        ...common,
        type: field.type === "hostname" ? "text" : field.type,
        maxlength: field.max_length,
        placeholder: field.placeholder,
        autocomplete: field.autocomplete ?? "off",
        autocapitalize: field.type === "hostname" ? "none" : undefined,
        spellcheck: field.type === "hostname" ? "false" : undefined,
        class: `input w-full text-base${field.required ? " validator" : ""}`,
      })} />`
  }
}

function renderField(field, form) {
  const id = `${form.kind}-${field.name}`
  const notes = [field.help_text, form.notes?.[field.name]].filter(Boolean)
  const links = (field.help_links ?? []).filter((link) => safeHref(link.href))
  const hasHelp = notes.length > 0 || links.length > 0
  const describedBy = [hasHelp ? `${id}-help` : null, `${id}-error`].filter(Boolean).join(" ")
  const rule = field.show_when
  const conditional = rule
    ? attributes({
        hidden: true,
        "data-show-when": "",
        "data-show-field": rule.field,
        ...("equals" in rule
          ? { "data-show-equals": rule.equals }
          : { "data-show-more-than": rule.more_than }),
      })
    : ""
  const star = field.required ? ' <span class="text-error">*</span>' : ""

  const heading =
    field.type === "checkbox"
      ? `<legend class="fieldset-legend text-[15px] font-medium text-base-content">${escapeHtml(field.label)}${star}</legend>`
      : `<label class="label text-[15px] font-medium text-base-content" for="${escapeHtml(id)}">${escapeHtml(field.label)}${star}</label>`

  const help = hasHelp
    ? `<p id="${escapeHtml(id)}-help" class="flex flex-wrap items-baseline gap-x-3 text-sm text-base-content/75">
        ${notes.map((note) => `<span>${escapeHtml(note)}</span>`).join("")}
        ${links.map((link) => `<a href="${escapeHtml(safeHref(link.href))}" class="link" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}
      </p>`
    : ""

  const hint =
    field.required && !["select", "textarea", "sshkeys", "checkbox"].includes(field.type)
      ? `<p class="validator-hint hidden">${escapeHtml(hintFor(field))}</p>`
      : ""

  const counter =
    field.type === "textarea" && form.counters?.includes(field.name) && field.max_length
      ? `<p class="label justify-end tabular-nums text-sm text-base-content/75" aria-hidden="true">
          <span><span data-count-for="${escapeHtml(field.name)}">0</span>/${escapeHtml(field.max_length)}</span>
        </p>`
      : ""

  return `<div class="${field.half ? "" : "sm:col-span-2"}" ${conditional}>
    <fieldset class="fieldset">
      ${heading}
      ${control(field, id, describedBy, form)}
      ${help}
      ${hint}
      <p id="${escapeHtml(id)}-error" data-field-error="${escapeHtml(field.name)}" class="text-sm text-error" hidden aria-live="polite"></p>
      ${counter}
    </fieldset>
  </div>`
}

// `form` is { kind, notes, counters } from src/data/forms.js: what this site adds to the API's
// description.
export function renderFields(description, form) {
  return description.sections
    .map(
      (section) => `<section class="flex flex-col gap-5">
    ${section.title ? `<h3 class="text-sm font-bold tracking-[0.1em] text-accent uppercase">${escapeHtml(section.title)}</h3>` : ""}
    <div class="grid gap-5 sm:grid-cols-2">
      ${section.fields.map((field) => renderField(field, form)).join("\n")}
    </div>
  </section>`,
    )
    .join("\n")
}
