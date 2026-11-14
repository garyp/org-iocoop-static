// The browser side of every form (see FormShell.astro): conditional fields, character counters,
// preselecting a menu from the address, the captcha, and submitting with fetch to django-iocoop with
// the API's errors shown beside their fields.
//
// The markup opts in through data attributes:
//   [data-submit] [data-spinner]                 the submit button and its spinner
//   [data-status-success] [data-status-error]    the two alerts ([data-error-text] holds the message)
//   [data-field-error="name"]                    where the API's message for a field goes
//   [data-show-when] with data-show-field and data-show-equals | data-show-more-than
//                                                a field shown only while another field matches
//   [data-count-for="name"]                      shows how many characters a field holds
//   [data-captcha]                               the reCAPTCHA widget

// Written out in full so Tailwind sees the class names and generates their CSS.
const errorClassByTag = { INPUT: "input-error", SELECT: "select-error", TEXTAREA: "textarea-error" }

// Google's reCAPTCHA script calls this once it has loaded (see Captcha.astro). Each widget follows
// the visitor's light or dark preference.
function renderCaptchas() {
  const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  for (const slot of document.querySelectorAll("[data-captcha]")) {
    if (slot.dataset.widgetId) continue
    // A ticked box expires after about two minutes; reset it so the visitor ticks it again instead
    // of sending a token the portal will refuse.
    const widgetId = window.grecaptcha.render(slot, {
      sitekey: slot.dataset.sitekey,
      theme,
      "expired-callback": () => window.grecaptcha.reset(widgetId),
    })
    slot.dataset.widgetId = String(widgetId)
  }
}
window.onRecaptchaLoad = renderCaptchas
if (window.grecaptcha?.render) renderCaptchas()

// DRF's error bodies: { field: ["message"] } for a 400, { detail: "message" } for the rest.
function readErrors(status, body) {
  const fields = {}
  let message = null
  if (body && typeof body === "object") {
    for (const [name, value] of Object.entries(body)) {
      const first = Array.isArray(value) ? value[0] : value
      if (name === "detail") message = String(first)
      else if (name === "non_field_errors") message = String(first)
      else fields[name] = String(first)
    }
  }
  if (status === 429) message = "You've sent a lot of requests. Please try again in a while."
  return { fields, message }
}

export function enhanceForm(form) {
  if (!form) return

  const submit = form.querySelector("[data-submit]")
  const spinner = form.querySelector("[data-spinner]")
  const successAlert = form.querySelector("[data-status-success]")
  const errorAlert = form.querySelector("[data-status-error]")
  const errorText = form.querySelector("[data-error-text]")

  function showError(text) {
    errorText.textContent = text
    errorAlert.classList.remove("hidden")
    errorAlert.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }

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

  function refreshCounters() {
    for (const update of counters) update()
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
    for (const [name, message] of Object.entries(fields)) {
      const control = form.elements[name]
      const slot = form.querySelector(`[data-field-error="${name}"]`)
      if (slot) {
        slot.textContent = message
        slot.hidden = false
      }
      if (control?.tagName) {
        control.setAttribute("aria-invalid", "true")
        const errorClass = errorClassByTag[control.tagName]
        if (errorClass) control.classList.add(errorClass)
        firstInvalid ??= control
      }
    }
    firstInvalid?.focus()
  }

  function resetCaptcha() {
    const widgetId = form.querySelector("[data-captcha]")?.dataset.widgetId
    if (widgetId !== undefined) window.grecaptcha?.reset(Number(widgetId))
  }

  // A link like /contact/?purpose=billing preselects that choice. Unknown values are ignored.
  for (const [name, value] of new URLSearchParams(location.search)) {
    const select = form.elements[name]
    if (
      select?.tagName === "SELECT" &&
      [...select.options].some((option) => option.value === value)
    ) {
      select.value = value
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

  // Editing a field clears the server's complaint about it.
  form.addEventListener("input", (event) => {
    if (event.target.name) clearFieldError(event.target)
  })

  refreshConditionalFields()

  function setBusy(busy) {
    submit.disabled = busy
    spinner.classList.toggle("hidden", !busy)
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

    // The API calls the token `captcha`; Google's widget names its field after itself.
    const body = new FormData(form)
    body.delete("g-recaptcha-response")
    body.set("captcha", token)

    setBusy(true)
    let tokenSpent = true
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body,
        headers: { Accept: "application/json" },
      })
      if (response.ok) {
        form.reset()
        refreshConditionalFields()
        refreshCounters()
        successAlert.classList.remove("hidden")
        successAlert.scrollIntoView({ block: "nearest", behavior: "smooth" })
      } else {
        const { fields, message } = readErrors(
          response.status,
          await response.json().catch(() => null),
        )
        // A form with mistakes is refused before the token is checked, so it is still good.
        tokenSpent = !(response.status === 400 && Object.keys(fields).length > 0 && !fields.captcha)
        showFieldErrors(fields)
        // Errors about something with no field on the page (the captcha, say) have nowhere to
        // appear beside a field, so they go in the alert.
        const unplaced = Object.entries(fields).filter(
          ([name]) => !form.querySelector(`[data-field-error="${name}"]`),
        )
        const placed = Object.keys(fields).length > unplaced.length
        showError(
          message ??
            unplaced[0]?.[1] ??
            (placed
              ? "Please check the highlighted fields."
              : "Something went wrong. Please try again in a few minutes."),
        )
      }
    } catch {
      showError("We couldn't reach the server. Please check your connection and try again.")
    } finally {
      setBusy(false)
      // Each captcha token works once, so get a fresh one for the next attempt.
      if (tokenSpent) resetCaptcha()
    }
  })
}
