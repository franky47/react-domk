import { parseAsString, createLoader } from "nuqs/server"

// Single source of truth for the meme text query param, shared between the
// client input (useQueryState) and the server-rendered OG image.
export const memeTextParser = parseAsString.withDefault("")

export const memeSearchParams = { text: memeTextParser }

export const loadMemeSearchParams = createLoader(memeSearchParams)
