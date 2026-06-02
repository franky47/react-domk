"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useQueryState } from "nuqs"
import { memeTextParser } from "@/lib/search-params"
import { addPngTextChunk, dataUrlToBytes } from "@/lib/png-metadata"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download } from "lucide-react"

const BASE_IMAGE_URL = "/base-meme.png"

export function MemeBuilder() {
  const [text, setText] = useQueryState("text", memeTextParser)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const drawMeme = useCallback(() => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img || !imageLoaded) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Calculate dimensions - image on top, white bar below
    const imgWidth = img.naturalWidth
    const imgHeight = img.naturalHeight
    const textBarHeight = Math.round(imgHeight * 0.18)
    
    canvas.width = imgWidth
    canvas.height = imgHeight + textBarHeight

    // Draw the image
    ctx.drawImage(img, 0, 0, imgWidth, imgHeight)

    // Draw white rectangle at bottom
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, imgHeight, imgWidth, textBarHeight)

    // Draw the text
    if (text) {
      ctx.fillStyle = "#000000"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      
      // Resolve the Geist family name injected by next/font into the CSS variable
      const geist =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--font-geist-sans")
          .trim() || "sans-serif"

      // Calculate font size based on text length and canvas width
      const maxFontSize = Math.round(textBarHeight * 0.65)
      const minFontSize = Math.round(textBarHeight * 0.3)
      const maxTextWidth = imgWidth * 0.9

      let fontSize = maxFontSize
      ctx.font = `bold ${fontSize}px ${geist}`

      // Reduce font size if text is too wide
      while (ctx.measureText(text).width > maxTextWidth && fontSize > minFontSize) {
        fontSize -= 2
        ctx.font = `bold ${fontSize}px ${geist}`
      }
      
      ctx.fillText(text, imgWidth / 2, imgHeight + textBarHeight / 2, maxTextWidth)
    }
  }, [text, imageLoaded])

  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }
    img.src = BASE_IMAGE_URL
  }, [])

  useEffect(() => {
    drawMeme()
  }, [drawMeme])

  // Redraw once the Geist webfont has finished loading so the canvas
  // uses real glyph metrics instead of the fallback.
  useEffect(() => {
    document.fonts.ready.then(drawMeme)
  }, [drawMeme])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Embed the current page URL (with ?text=…) into the PNG so the meme
    // carries a link back to its editable source.
    const bytes = dataUrlToBytes(canvas.toDataURL("image/png"))
    const withUrl = addPngTextChunk(bytes, "URL", window.location.href)
    const blob = new Blob([withUrl], { type: "image/png" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.download = "react-domk-meme.png"
    link.href = url
    link.click()

    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
      <div className="w-full rounded-lg overflow-hidden shadow-lg bg-white">
        <canvas 
          ref={canvasRef} 
          className="w-full h-auto"
        />
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Input
          type="text"
          placeholder="Enter your meme text..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 text-lg h-12"
        />
        <Button 
          onClick={handleDownload}
          size="lg"
          className="gap-2 h-12"
        >
          <Download className="w-5 h-5" />
          Download PNG
        </Button>
      </div>
    </div>
  )
}
