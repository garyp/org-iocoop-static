// Cloudflare Pages Function: POST /api/contact. The logic lives in functions/_lib so it can be
// tested with `bun test` (see tests/contact.test.js).
import { createContactHandler } from "../_lib/contact-handler.js"

export const onRequestPost = createContactHandler()
