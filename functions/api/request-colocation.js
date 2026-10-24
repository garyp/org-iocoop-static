// Cloudflare Pages Function: POST /api/request-colocation. The logic lives in functions/_lib.
import { createRequestHandler } from "../_lib/request-handler.js"

export const onRequestPost = createRequestHandler("colocation")
