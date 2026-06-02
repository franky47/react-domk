import { ImageResponse } from "next/og"
import { loadMemeSearchParams } from "@/lib/search-params"

export const runtime = "edge"

// Base image is 732x498; the white text bar is 18% of its height. We render
// the OG image at 2x for crispness while preserving the canvas proportions.
const SCALE = 2
const BASE_W = 732
const BASE_H = 498
const W = BASE_W * SCALE
const IMG_H = BASE_H * SCALE
const BAR_H = Math.round(BASE_H * 0.18) * SCALE
const H = IMG_H + BAR_H

// Mirrors the canvas font sizing in components/meme-builder.tsx. Satori can't
// measure glyphs, so we approximate Geist Bold's advance width to shrink the
// text until it fits ~90% of the width.
const MAX_FONT = Math.round(BAR_H * 0.65)
const MIN_FONT = Math.round(BAR_H * 0.3)
const MAX_TEXT_W = W * 0.9
const AVG_CHAR_W = 0.52

// Returns the font size and a horizontal scale. Like the canvas, we first
// shrink the font down to a floor, then (if still too wide) condense the text
// horizontally so it always fits instead of clipping.
function fitText(text: string): { fontSize: number; scaleX: number } {
  const estWidth = (fs: number) => text.length * fs * AVG_CHAR_W
  let fontSize = MAX_FONT
  while (estWidth(fontSize) > MAX_TEXT_W && fontSize > MIN_FONT) {
    fontSize -= 2
  }
  const natural = estWidth(fontSize)
  const scaleX = natural > MAX_TEXT_W ? MAX_TEXT_W / natural : 1
  return { fontSize, scaleX }
}

// Fetch the exact glyphs we need from Google Fonts as TTF for Satori.
async function loadGeist(text: string): Promise<ArrayBuffer> {
  const family = "Geist:wght@700"
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`
  const css = await fetch(url, {
    headers: {
      // Ask for a TTF source Satori can parse (no woff2 user-agent hint).
      "User-Agent": "Mozilla/5.0 (compatible; Satori)",
    },
  }).then((r) => r.text())
  const src = css.match(/src:\s*url\(([^)]+)\)/)?.[1]
  if (!src) throw new Error("Could not locate Geist font URL in Google CSS")
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to fetch Geist font: ${res.status}`)
  return res.arrayBuffer()
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const { text } = loadMemeSearchParams(url.searchParams)

  const { fontSize, scaleX } = fitText(text)
  // Always include ascii so a missing/short caption still embeds usable glyphs.
  const fontData = await loadGeist(text + " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: W,
          height: H,
          backgroundColor: "#ffffff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${url.origin}/base-meme.png`} width={W} height={IMG_H} alt="" />
        <div
          style={{
            display: "flex",
            width: W,
            height: BAR_H,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
          }}
        >
          <div
            style={{
              fontFamily: "Geist",
              fontWeight: 700,
              fontSize,
              color: "#000000",
              whiteSpace: "nowrap",
              transform: `scaleX(${scaleX})`,
            }}
          >
            {text}
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "Geist", data: fontData, weight: 700, style: "normal" }],
      headers: {
        // The image is a pure function of ?text=, so it never changes for a
        // given URL. Cache it hard on Vercel's edge to skip recompute on
        // repeat shares; SWR keeps things warm past the freshness window.
        "Cache-Control":
          "public, immutable, no-transform, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400",
      },
    },
  )
}
