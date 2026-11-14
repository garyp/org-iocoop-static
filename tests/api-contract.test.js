import { describe, expect, test } from "bun:test"
import { compareForm, readControls, requestSchemaFor, resolve } from "../scripts/api-contract.js"

const schema = {
  paths: {
    "/api/v1/things/": {
      post: {
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/Thing" } } },
        },
      },
    },
  },
  components: {
    schemas: {
      ColorEnum: { enum: ["red", "blue"] },
      Thing: {
        required: ["name", "color", "captcha"],
        properties: {
          name: { type: "string", maxLength: 10 },
          color: { allOf: [{ $ref: "#/components/schemas/ColorEnum" }] },
          size: { type: "integer", minimum: 1, maximum: 5 },
          note: { type: "string" },
          captcha: { type: "string" },
        },
      },
    },
  },
}

const request = requestSchemaFor(schema, "things")
const goodControls = () => ({
  name: { required: true, maxlength: 10 },
  color: { required: true, options: ["red", "blue"] },
  size: { required: false, min: 1, max: 5 },
  note: { required: false },
  website: { required: false },
})

describe("compareForm", () => {
  test("finds the request body and follows refs", () => {
    expect(request.required).toContain("name")
    expect(resolve(schema, request.properties.color).enum).toEqual(["red", "blue"])
  })

  test("a form that agrees has no problems", () => {
    expect(compareForm(schema, request, goodControls())).toEqual([])
  })

  test("a field the API takes but the form lacks", () => {
    const controls = goodControls()
    delete controls.note
    expect(compareForm(schema, request, controls)).toEqual([
      'the API takes "note" but the form has no control for it',
    ])
  })

  test("a field the form sends but the API doesn't know", () => {
    const controls = { ...goodControls(), extra: { required: false } }
    expect(compareForm(schema, request, controls)[0]).toContain('"extra" but the API')
  })

  test("required on one side only", () => {
    const controls = goodControls()
    controls.name.required = false
    controls.note.required = true
    expect(compareForm(schema, request, controls)).toEqual([
      '"name" is required by the API but not on the form',
      '"note" is required on the form but optional in the API',
    ])
  })

  test("a conditional field may be required on the page while it is hidden", () => {
    const controls = goodControls()
    controls.note = { required: true, disabled: true }
    expect(compareForm(schema, request, controls)).toEqual([])
  })

  test("menu options must match the API's choices", () => {
    const controls = goodControls()
    controls.color.options = ["red", "green"]
    expect(compareForm(schema, request, controls)).toEqual([
      '"color" doesn\'t offer: blue',
      '"color" offers values the API rejects: green',
    ])
  })

  test("maxlength may not exceed the API's", () => {
    const controls = goodControls()
    controls.name.maxlength = 50
    expect(compareForm(schema, request, controls)[0]).toContain('"name" should have maxlength 10')
    controls.name.maxlength = undefined
    expect(compareForm(schema, request, controls)[0]).toContain("has none")
  })

  test("number limits must match", () => {
    const controls = goodControls()
    controls.size.max = 9
    expect(compareForm(schema, request, controls)).toEqual(['"size" max is 9, the API says 5'])
  })
})

describe("readControls", () => {
  const html = `<nav><input name="search"></nav>
    <form data-enhance-form action="https://api.example/api/v1/things/">
      <input name="name" required maxlength="10" />
      <select name="color" required><option value="red">Red</option><option value="blue">Blue</option></select>
      <input type="number" name="size" min="1" max="5" disabled />
      <textarea name="note"></textarea>
    </form>
    <form data-enhance-form action="https://api.example/api/v1/other/"><input name="nope" /></form>`

  test("reads the controls of the form for the resource", async () => {
    const controls = await readControls(html, "things")
    expect(Object.keys(controls)).toEqual(["name", "color", "size", "note"])
    expect(controls.name).toMatchObject({ required: true, maxlength: 10 })
    expect(controls.color.options).toEqual(["red", "blue"])
    expect(controls.size).toMatchObject({ min: 1, max: 5, disabled: true })
    expect(controls.note.required).toBe(false)
  })
})
