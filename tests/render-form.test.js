import { describe, expect, test } from "bun:test"
import { escapeHtml, renderFields } from "../src/lib/render-form.js"

const page = { kind: "vps", notes: { slices: "$10 per month." }, counters: ["message"] }

const description = {
  title: "VPS request",
  sections: [
    {
      title: "Your VPS",
      fields: [
        {
          name: "hostname",
          label: "Hostname",
          type: "hostname",
          required: true,
          help_text: "Must be fully qualified.",
          max_length: 253,
          placeholder: "myhost.example.com",
        },
        {
          name: "slices",
          label: "Number of slices",
          type: "select",
          required: true,
          half: true,
          initial: "2",
          help_text: "Each slice gives you 1 GB.",
          choices: [
            { value: "1", label: "1" },
            { value: "2", label: "2" },
          ],
        },
        {
          name: "depth",
          label: "Depth",
          type: "number",
          required: true,
          min: 1,
          max: 28.74,
          decimal: true,
          unit: "inches",
        },
        {
          name: "os_other",
          label: "Which operating system?",
          type: "text",
          required: true,
          show_when: { field: "os", equals: "other" },
        },
        {
          name: "ipv4_justification",
          label: "Why?",
          type: "textarea",
          required: true,
          show_when: { field: "ipv4", more_than: 1 },
        },
        { name: "message", label: "Message", type: "textarea", max_length: 2000 },
        {
          name: "policies",
          label: "Policies",
          type: "checkbox",
          required: true,
          checkbox_label: "I agree.",
          help_links: [{ label: "Read them", href: "/docs/policies/" }],
        },
      ],
    },
    { title: "", fields: [{ name: "comments", label: "Comments", type: "textarea" }] },
  ],
}

const html = renderFields(description, page)

describe("renderFields", () => {
  test("renders a heading per titled section and none for an untitled one", () => {
    expect(html).toContain("Your VPS</h3>")
    expect(html.match(/<h3/g)).toHaveLength(1)
  })

  test("ids and names follow the form kind and field name", () => {
    expect(html).toContain('id="vps-hostname"')
    expect(html).toContain('name="hostname"')
    expect(html).toContain('for="vps-hostname"')
    expect(html).toContain('data-field-error="hostname"')
  })

  test("required fields are marked", () => {
    expect(html).toMatch(/<input [^>]*name="hostname"[^>]*\brequired\b/)
    expect(html).toContain('<span class="text-error">*</span>')
    expect(html).not.toMatch(/<textarea [^>]*name="comments"[^>]*\brequired\b/)
  })

  test("selects select their initial choice", () => {
    expect(html).toContain('<option value="2" selected>2</option>')
    expect(html).toContain('<option value="1">1</option>')
  })

  test("numbers get limits, a decimal step and a unit", () => {
    expect(html).toMatch(/name="depth"[^>]*min="1"[^>]*max="28.74"[^>]*step="any"/)
    expect(html).toContain("inches</span>")
  })

  test("conditional fields start hidden and disabled, and name what they watch", () => {
    expect(html).toContain('hidden data-show-when="" data-show-field="os" data-show-equals="other"')
    expect(html).toContain('data-show-more-than="1"')
    expect(html).toMatch(/<input [^>]*name="os_other"[^>]*\bdisabled\b/)
  })

  test("half-width fields share a row", () => {
    expect(html).toMatch(
      /<div class="" >\s*<fieldset class="fieldset">\s*<label[^>]*for="vps-slices"/,
    )
  })

  test("this site's notes follow the API's help text", () => {
    expect(html).toMatch(/Each slice gives you 1 GB\.<\/span><span>\$10 per month\.<\/span>/)
  })

  test("counters only for the fields the page asks for", () => {
    expect(html).toContain('data-count-for="message"')
    expect(html).toContain("/2000")
    expect(html).not.toContain('data-count-for="comments"')
  })

  test("checkboxes use their own label and carry help links", () => {
    expect(html).toContain("<span>I agree.</span>")
    expect(html).toContain('href="/docs/policies/"')
  })
})

describe("untrusted text from the API", () => {
  const render = (field) =>
    renderFields({ sections: [{ title: field.title ?? "", fields: [field] }] }, page)

  test("is escaped", () => {
    const evil = "<img src=x onerror=alert(1)>\"'"
    const result = render({
      title: evil,
      name: "x",
      label: evil,
      type: "text",
      help_text: evil,
      placeholder: evil,
      help_links: [{ label: evil, href: "https://example.com/" }],
    })
    expect(result).not.toContain("<img")
    expect(result).toContain("&lt;img src=x onerror=alert(1)&gt;&quot;&#39;")
  })

  test("links are limited to http(s) and site paths", () => {
    const result = render({
      name: "x",
      label: "X",
      type: "text",
      help_links: [
        { label: "bad", href: "javascript:alert(1)" },
        { label: "protocol-relative", href: "//evil.example/" },
        { label: "backslash", href: "/\\evil.example/" },
        { label: "good", href: "https://example.com/?a=1&b=2" },
      ],
    })
    expect(result).not.toContain("javascript:")
    expect(result).not.toContain("evil.example")
    expect(result).toContain('href="https://example.com/?a=1&amp;b=2"')
  })

  test("escapeHtml escapes the five characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;")
  })
})
