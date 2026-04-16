import type { Metadata } from "next"
import { IBM_Plex_Sans, Source_Sans_3 } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

/** Headings: technical / enterprise; distinct from generic geometric sans defaults */
const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
})

/** Body: high legibility at table density; pairs cleanly with IBM Plex */
const sourceSans3 = Source_Sans_3({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Questionnaire Platform",
  description: "Internal sales questionnaire platform",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${sourceSans3.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
