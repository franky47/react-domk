import { Suspense } from "react"
import type { Metadata } from "next"
import type { SearchParams } from "nuqs/server"
import { MemeBuilder } from "@/components/meme-builder"
import { loadMemeSearchParams } from "@/lib/search-params"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { text } = await loadMemeSearchParams(searchParams)
  const ogImage = `/api/og?text=${encodeURIComponent(text)}`
  const description = `Dominik reacts: ${text}`
  return {
    openGraph: {
      description,
      images: [{ url: ogImage, width: 1464, height: 1176 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            React DOMk
          </h1>
          <p className="text-muted-foreground">
            Dominik is shocked
          </p>
        </header>
        
        <Suspense>
          <MemeBuilder />
        </Suspense>
        
        <footer className="text-center mt-12 text-sm text-muted-foreground">
          Local-first, no data stored
          {" • made by "}
          <a
            href="https://x.com/fortysevenfx/status/2061850522647134229"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            @fortysevenfx
          </a>
        </footer>
      </div>
    </main>
  )
}
