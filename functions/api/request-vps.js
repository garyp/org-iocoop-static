// Cloudflare Pages Function: POST /api/request-vps. The logic lives in functions/_lib.
import { createRequestHandler } from "../_lib/request-handler.js"

export const onRequestPost = createRequestHandler("vps")
