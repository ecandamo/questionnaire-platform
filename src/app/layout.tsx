import type { Metadata } from "next"
import { JetBrains_Mono, Mulish } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import "./globals.css"

/** API Global Solutions design system: Mulish for UI + display (replaces Sailec) */
const mulish = Mulish({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

/** Data / PNRs / monospace (design system) */
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${mulish.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
