// `bun run check:api [schema.json | URL]` (after `bun run build`): checks every form in dist/
// against django-iocoop's OpenAPI schema (see api-contract.js). With no argument it fetches the
// schema from PUBLIC_API_URL. Exits 1 if any form disagrees with the API.
import { compareForm, forms, readControls, requestSchemaFor } from "./api-contract.js"

const source =
  process.argv[2] ?? `${(process.env.PUBLIC_API_URL ?? "").replace(/\/+$/, "")}/schema/?format=json`
if (!process.argv[2] && !process.env.PUBLIC_API_URL) {
  console.error("check-api: pass a schema file or URL, or set PUBLIC_API_URL")
  process.exit(2)
}

const schema = /^https?:/.test(source)
  ? await (await fetch(source)).json()
  : await Bun.file(source).json()

let failed = false
for (const form of forms) {
  const requestSchema = requestSchemaFor(schema, form.resource)
  if (!requestSchema) {
    console.error(`✗ ${form.resource}: not in the API's schema`)
    failed = true
    continue
  }
  const html = await Bun.file(new URL(`../dist/${form.page}`, import.meta.url)).text()
  const problems = compareForm(schema, requestSchema, await readControls(html, form.resource))
  if (problems.length === 0) console.log(`✓ ${form.resource} (${form.page})`)
  else {
    failed = true
    console.error(`✗ ${form.resource} (${form.page})`)
    for (const problem of problems) console.error(`    ${problem}`)
  }
}
process.exit(failed ? 1 : 0)
