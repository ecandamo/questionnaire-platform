"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/"

  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await signIn.email({
        email,
        password,
      })
      if (result.error) {
        toast.error(result.error.message ?? "Invalid credentials")
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 166.22 85.48" className="w-32" aria-label="API logo">
            <rect fill="#273b6e" x="148.84" y="0.02" width="17.38" height="85.4"/>
            <path fill="#273b6e" d="M120.17,0c-12.66,0-25.32.12-38,.12V69.64L52.72.06H36.15L0,85.42H16.46L44.43,18,72.29,85.42h9.9v.06H97.38V15.36h22.79c19.34,0,19.46,30.24,0,30.24h-7.59V60.36h7.59C159.66,60.36,159.55,0,120.17,0Z"/>
            <line stroke="#78bc43" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.5" fill="none" x1="43.9" y1="49.84" x2="43.9" y2="72.34"/>
            <line stroke="#78bc43" strokeLinecap="round" strokeMiterlimit="10" strokeWidth="3.5" fill="none" x1="55.15" y1="61.09" x2="32.65" y2="61.09"/>
          </svg>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-bold text-foreground tracking-tight">
              Questionnaire Platform
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Internal Sales Tool</p>
          </div>
        </div>

        <Card className="shadow-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="font-heading text-lg">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Contact your administrator if you need access.
        </p>
      </div>
    </div>
  )
}
