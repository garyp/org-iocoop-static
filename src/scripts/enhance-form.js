// Behaviour shared by the contact form and the request forms: submitting with fetch, the busy
// state, the captcha, conditional fields, character counters and per-field server errors.
//
// The markup opts in through data attributes:
//   [data-submit] [data-spinner]                 the submit button and its spinner
//   [data-status-success] [data-status-error]    the two alerts ([data-error-text] holds the message)
//   [data-field-error="name"]                    where the server's message for a field goes
//   [data-show-when] with data-show-field and data-show-equals | data-show-more-than
//                                                a field shown only while another field matches
//   [data-count-for="name"]                      shows how many characters a field holds
//   [data-less-than="n"]                         a number input that must stay below n

// Written out in full so Tailwind sees the class names and generates their CSS.
const errorClassByTag = { INPUT: "input-error", SELECT: "select-error", TEXTAREA: "textarea-error" }

// Google's reCAPTCHA script calls this once it has loaded (see Captcha.astro). Each widget follows
// the visitor's light or dark preference.
function renderCaptchas() {
  const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  for (const slot of document.querySelectorAll("[data-captcha]")) {
    if (slot.dataset.widgetId) continue
    slot.dataset.widgetId = String(
      window.grecaptcha.render(slot, { sitekey: slot.dataset.sitekey, theme }),
    )
  }
}
window.onRecaptchaLoad = renderCaptchas
if (window.grecaptcha?.render) renderCaptchas()

export function enhanceForm(form) {
  if (!form) return

  const submit = form.querySelector("[data-submit]")
  const spinner = form.querySelector("[data-spinner]")
  const successAlert = form.querySelector("[data-status-success]")
  const errorAlert = form.querySelector("[data-status-error]")
  const errorText = form.querySelector("[data-error-text]")

  // Fields that appear only when another field has a particular value. A hidden field is also
  // disabled, so the browser neither requires it nor sends it.
  const conditionalFields = [...form.querySelectorAll("[data-show-when]")]
  function refreshConditionalFields() {
    for (const wrapper of conditionalFields) {
      const value = form.elements[wrapper.dataset.showField]?.value ?? ""
      let visible = false
      if ("showEquals" in wrapper.dataset) visible = value === wrapper.dataset.showEquals
      else if ("showMoreThan" in wrapper.dataset) {
        visible = value !== "" && Number(value) > Number(wrapper.dataset.showMoreThan)
      }
      wrapper.hidden = !visible
      for (const control of wrapper.querySelectorAll("input, select, textarea")) {
        control.disabled = !visible
      }
    }
  }
  form.addEventListener("input", refreshConditionalFields)
  form.addEventListener("change", refreshConditionalFields)

  const counters = [...form.querySelectorAll("[data-count-for]")].map((counter) => {
    const field = form.elements[counter.dataset.countFor]
    const update = () => {
      counter.textContent = String(field.value.length)
    }
    field.addEventListener("input", update)
    return update
  })

  // A "less than" limit can't be written as a min/max attribute, so it is checked here.
  for (const input of form.querySelectorAll("[data-less-than]")) {
    const limit = Number(input.dataset.lessThan)
    input.addEventListener("input", () => {
      const tooBig = input.value !== "" && Number(input.value) >= limit
      input.setCustomValidity(tooBig ? `Must be less than ${limit}.` : "")
    })
  }

  function clearFieldError(control) {
    const slot = form.querySelector(`[data-field-error="${control.name}"]`)
    if (slot) {
      slot.textContent = ""
      slot.hidden = true
    }
    control.removeAttribute("aria-invalid")
    const errorClass = errorClassByTag[control.tagName]
    if (errorClass) control.classList.remove(errorClass)
  }

  function showFieldErrors(fields) {
    let firstInvalid = null
    for (const [name, message] of Object.entries(fields ?? {})) {
      const control = form.elements[name]
      const slot = form.querySelector(`[data-field-error="${name}"]`)
      if (slot) {
        slot.textContent = message
        slot.hidden = false
      }
      if (control && control.tagName) {
        control.setAttribute("aria-invalid", "true")
        const errorClass = errorClassByTag[control.tagName]
        if (errorClass) control.classList.add(errorClass)
        firstInvalid ??= control
      }
    }
    firstInvalid?.focus()
  }

  // Editing a field clears the server's complaint about it.
  form.addEventListener("input", (event) => {
    if (event.target.name) clearFieldError(event.target)
  })

  function setBusy(busy) {
    submit.disabled = busy
    spinner.classList.toggle("hidden", !busy)
  }

  function showError(text) {
    errorText.textContent = text
    errorAlert.classList.remove("hidden")
    errorAlert.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    successAlert.classList.add("hidden")
    errorAlert.classList.add("hidden")
    for (const control of form.querySelectorAll("[aria-invalid]")) clearFieldError(control)

    const token = form.querySelector('[name="g-recaptcha-response"]')?.value
    if (!token) {
      showError("Please tick the box to show you're not a robot, then send again.")
      return
    }

    setBusy(true)
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      })
      const result = await response.json().catch(() => null)
      if (response.ok && result?.ok) {
        form.reset()
        refreshConditionalFields()
        for (const update of counters) update()
        successAlert.classList.remove("hidden")
        successAlert.scrollIntoView({ block: "nearest", behavior: "smooth" })
      } else {
        showFieldErrors(result?.fields)
        showError(result?.error ?? "Something went wrong. Please try again in a few minutes.")
      }
    } catch {
      showError("We couldn't reach the server. Please check your connection and try again.")
    } finally {
      setBusy(false)
      // Each captcha token works once, so get a fresh one for the next attempt.
      const widgetId = form.querySelector("[data-captcha]")?.dataset.widgetId
      if (widgetId !== undefined) window.grecaptcha?.reset(Number(widgetId))
    }
  })

  refreshConditionalFields()
}
