// Converts the policies in the vendor/policies submodule (github.com/iocoop/policies) into docs
// content: src/content/docs/policies/*.md. That folder is generated and gitignored; run this via
// `bun run policies:sync` (the dev and build scripts do it automatically).
//
// The upstream files are Python-Markdown. This script only reshapes them for this site. It records
// every edit that changes wording and then verifies that the output matches the source word for
// word, apart from those recorded edits, so a bad pattern can't quietly alter legal text.
import { mkdir, readdir, rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { policies, policySlugs } from "../src/data/policies.js"

const sourceDirectory = new URL("../vendor/policies/", import.meta.url)
const outputDirectory = new URL("../src/content/docs/policies/", import.meta.url)
const historyUrl = "https://github.com/iocoop/policies/commits/master/"
const dmcaEmailPlaceholder = "[DMCA agent email address: to be confirmed]"
const upstreamNonPolicies = new Set(["README.md", "index.md"])
const submodulePath = fileURLToPath(sourceDirectory)

function fail(message) {
  console.error(`sync-policies: ${message}`)
  process.exit(1)
}

// The words a reader would see, ignoring markup and link targets.
function tokenize(text) {
  return (
    text
      .replace(/^[ \t]*\[[^\]\n]+\]:[ \t].*$/gm, "")
      .replace(/\]\([^)]*\)/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replaceAll("\\", "")
      .toLowerCase()
      .match(/[\p{L}\p{N}_'’@.$%/-]+/gu) ?? []
  )
}

function findSequence(words, sequence) {
  if (sequence.length === 0) return -1
  for (let start = 0; start <= words.length - sequence.length; start += 1) {
    if (sequence.every((word, offset) => words[start + offset] === word)) return start
  }
  return -1
}

// Replaces text and records the change, so the integrity check knows it was intended.
function editWording(body, pattern, replacement, edits) {
  const global =
    typeof pattern === "string"
      ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")
      : new RegExp(
          pattern.source,
          pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
        )
  for (const match of body.matchAll(global)) {
    edits.push({ removed: match[0], inserted: replacement })
  }
  return body.replace(global, () => replacement)
}

// Point links between policies at their new addresses.
function rewritePolicyLinks(body) {
  const target = (oldFile, anchor = "") =>
    policySlugs[oldFile] ? `/docs/policies/${policySlugs[oldFile]}/${anchor}` : null

  return body
    .replace(
      /^([ \t]*\[[^\]\n]+\]:[ \t]*)(?:\.\.\/)?([a-z-]+)(#[\w-]+)?[ \t]*$/gm,
      (whole, prefix, oldFile, anchor) => {
        const rewritten = target(oldFile, anchor)
        return rewritten ? `${prefix}${rewritten}` : whole
      },
    )
    .replace(/\]\((?:\.\.\/)?([a-z-]+)(#[\w-]+)?\)/g, (whole, oldFile, anchor) => {
      const rewritten = target(oldFile, anchor)
      return rewritten ? `](${rewritten})` : whole
    })
}

// Each policy's last-changed date, from the submodule's git history. Hosts often clone submodules
// shallowly, which would give every file the date of the one commit they fetched, so fetch the
// full history first. If that isn't possible, return no dates rather than wrong ones.
async function readLastChangedDates() {
  const git = (...args) => Bun.$`git -C ${submodulePath} ${args}`.quiet().nothrow()
  const isShallow = async () =>
    (await git("rev-parse", "--is-shallow-repository").text()).trim() === "true"

  if (await isShallow()) {
    await git("fetch", "--unshallow", "--quiet")
    if (await isShallow()) {
      console.warn("sync-policies: vendor/policies is shallow and could not be unshallowed;")
      console.warn("  policy pages will not show a last-updated date.")
      return {}
    }
  }

  const dates = {}
  for (const policy of policies) {
    const date = (await git("log", "-1", "--format=%cs", "--", `${policy.file}.md`).text()).trim()
    if (date) dates[policy.file] = date
    else console.warn(`sync-policies: no git history for ${policy.file}.md; omitting its date`)
  }
  return dates
}

function convert(policy, source, date) {
  const titleMatch = source.match(/^Title: (.+)\n\n?/)
  if (!titleMatch) fail(`${policy.file}.md has no "Title:" line`)
  const title = titleMatch[1].trim()
  const sourceBody = source.slice(titleMatch[0].length)

  const edits = []
  let body = sourceBody

  // The sidebar replaces both tables of contents and the [TOC] marker.
  body = editWording(
    body,
    /^## Summarized Table of Contents\n\n(?:\* \[[^\n]+\]\(#[^)\n]+\)\n)+\n/m,
    "",
    edits,
  )
  body = editWording(body, /^## Detailed Table of Contents\n\n\[TOC\]\n\n\* \* \*\n\n/m, "", edits)
  body = editWording(body, /^\[TOC\]\n\n/m, "", edits)

  // The DMCA agent's address was hidden behind Google Mailhide, which no longer exists.
  body = editWording(body, "dmca[...][dmca email captcha]@iocoop.org", dmcaEmailPlaceholder, edits)
  body = body.replace(/^[ \t]*\[dmca email captcha\]:.*\n/m, "")

  body = rewritePolicyLinks(body)
  body = body.replace(
    "https://iocoop.org/member_docs/billing/#autobill",
    "/docs/members/billing/#how-to-setup-auto-billing",
  )

  verifyWording(policy.file, sourceBody, body, edits)

  const frontMatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(policy.description)}`,
    `group: ${JSON.stringify(policy.group)}`,
    `order: ${policy.order}`,
    ...(date ? [`updated: ${date}`] : []),
    `history: ${historyUrl}${policy.file}.md`,
    "---",
    "",
    "",
  ].join("\n")
  return frontMatter + body.replace(/\n+$/, "") + "\n"
}

function verifyWording(file, sourceBody, outputBody, edits) {
  const expected = tokenize(sourceBody)
  for (const edit of edits) {
    const removed = tokenize(edit.removed)
    const start = findSequence(expected, removed)
    if (start === -1) fail(`${file}: could not locate an edited passage in the source`)
    expected.splice(start, removed.length, ...tokenize(edit.inserted))
  }
  const actual = tokenize(outputBody)
  const mismatch = expected.findIndex((word, index) => word !== actual[index])
  if (mismatch !== -1 || expected.length !== actual.length) {
    const at = mismatch === -1 ? Math.min(expected.length, actual.length) : mismatch
    fail(
      `${file}: output differs from the source beyond the recorded edits near word ${at}: ` +
        `expected "${expected.slice(at - 3, at + 4).join(" ")}", ` +
        `got "${actual.slice(at - 3, at + 4).join(" ")}"`,
    )
  }
}

const upstreamFiles = (await readdir(sourceDirectory).catch(() => [])).filter(
  (name) => name.endsWith(".md") && !upstreamNonPolicies.has(name),
)
if (upstreamFiles.length === 0) {
  fail("vendor/policies is empty. Run `git submodule update --init vendor/policies`.")
}

const mapped = new Set(policies.map((policy) => `${policy.file}.md`))
for (const name of upstreamFiles) {
  if (!mapped.has(name)) fail(`${name} is new upstream. Add it to src/data/policies.js.`)
}
for (const name of mapped) {
  if (!upstreamFiles.includes(name)) fail(`${name} is in src/data/policies.js but not upstream.`)
}

// Convert everything first so a failure never leaves the output folder half written.
const lastChanged = await readLastChangedDates()
const converted = []
for (const policy of policies) {
  const source = await Bun.file(new URL(`${policy.file}.md`, sourceDirectory)).text()
  converted.push({ slug: policy.slug, markdown: convert(policy, source, lastChanged[policy.file]) })
}

await rm(outputDirectory, { recursive: true, force: true })
await mkdir(outputDirectory, { recursive: true })
for (const { slug, markdown } of converted) {
  await Bun.write(new URL(`${slug}.md`, outputDirectory), markdown)
}

console.log(`sync-policies: wrote ${converted.length} policies to src/content/docs/policies/`)
