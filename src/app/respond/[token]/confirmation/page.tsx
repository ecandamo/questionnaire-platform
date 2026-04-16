import { CheckCircle2Icon } from "lucide-react"
import { ApiLogo } from "@/components/shared/api-logo"

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      {/* Branded top bar */}
      <header className="bg-primary px-6 h-14 flex items-center shrink-0">
        <ApiLogo variant="white" className="w-20" />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full space-y-8">
          {/* Success mark */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-card ring-2 ring-success/20 shadow-lg flex items-center justify-center">
              <CheckCircle2Icon className="h-10 w-10 text-success" strokeWidth={1.5} />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-3">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              Thank you!
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed max-w-xs mx-auto">
              Your questionnaire has been submitted. The team will review your responses shortly.
            </p>
          </div>

          {/* Next steps */}
          <div className="text-left space-y-3">
            {[
              { n: "01", text: "Your responses have been securely saved" },
              { n: "02", text: "The sales team will review your answers" },
              { n: "03", text: "Someone will follow up with you soon" },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4">
                <span className="font-mono text-[11px] font-medium text-muted-foreground/50 mt-0.5 shrink-0 tabular-nums w-6">
                  {n}
                </span>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/60">You may close this window.</p>
        </div>
      </div>
    </div>
  )
}
