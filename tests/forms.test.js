import { describe, expect, test } from "bun:test"
import { contactPurposes, defaultPurpose } from "../src/data/contact-purposes.js"
import { requestForms } from "../src/data/request-forms.js"

// The field names are the contract with django-iocoop's serializers (iocoop/api/serializers.py),
// so they must be plain snake_case and every reference between fields must resolve.
describe("request forms", () => {
  for (const [kind, form] of Object.entries(requestForms)) {
    describe(kind, () => {
      const names = form.fields.map((field) => field.name)

      test("field names are unique snake_case", () => {
        expect(new Set(names).size).toBe(names.length)
        for (const name of names) expect(name).toMatch(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
      })

      test("conditional fields watch a field that exists", () => {
        for (const field of form.fields.filter((candidate) => candidate.showWhen)) {
          expect(names).toContain(field.showWhen.field)
        }
      })

      test("menus have options and a default among them", () => {
        for (const field of form.fields.filter((candidate) => candidate.type === "select")) {
          const values = field.options.map((option) => option.value)
          expect(values.length).toBeGreaterThan(0)
          if (field.defaultValue !== undefined) expect(values).toContain(field.defaultValue)
        }
      })

      test("contains no real email addresses", () => {
        // (placeholders on example.com are fine)
        expect(JSON.stringify(form).replace(/@example\.com/g, "")).not.toMatch(
          /@[a-z0-9-]+\.[a-z]/i,
        )
      })
    })
  }

  test("the membership form offers only individual and organization", () => {
    const type = requestForms.join.fields.find((field) => field.name === "membership_type")
    expect(type.options.map((option) => option.value)).toEqual(["individual", "organization"])
  })
})

describe("contact purposes", () => {
  test("the default is one of them", () => {
    expect(contactPurposes.map((purpose) => purpose.value)).toContain(defaultPurpose)
  })
})
