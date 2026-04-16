"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2Icon } from "lucide-react"
import { toast } from "sonner"
import { ApiLogo } from "@/components/shared/api-logo"

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
      const result = await signIn.email({ email, password })
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
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between bg-primary px-12 py-14 shrink-0">
        <div>
          <ApiLogo variant="white" className="w-28" />
        </div>

        <div className="space-y-4">
          <p aria-hidden="true" className="font-heading text-4xl font-bold text-white leading-tight tracking-tight">
            Questionnaire<br />Platform
          </p>
          <p className="text-primary-foreground/60 text-base leading-relaxed max-w-xs">
            Build, share, and manage questionnaires for prospects and clients — all in one place.
          </p>
        </div>

        <p className="text-primary-foreground/30 text-xs">
          Internal Sales Tool · API
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 flex flex-col items-center gap-3">
          <ApiLogo variant="navy" className="w-24" />
          <p className="text-sm font-medium text-muted-foreground">Questionnaire Platform</p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>
            <Button type="submit" className="w-full h-10 mt-1" disabled={loading} aria-busy={loading}>
              {loading && <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden />}
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    </div>
  )
}
