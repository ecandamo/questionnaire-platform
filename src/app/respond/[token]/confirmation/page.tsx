import { CheckCircle2Icon } from "lucide-react"

export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-5">
        <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
          <CheckCircle2Icon className="h-8 w-8 text-success" />
        </div>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            Thank you!
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your questionnaire has been submitted successfully.
            The team will review your responses and be in touch shortly.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-left space-y-1.5 text-sm">
          <p className="font-medium">What happens next?</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>· Your responses have been saved</li>
            <li>· The sales team will review your answers</li>
            <li>· Someone will follow up with you soon</li>
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">You may close this window.</p>
      </div>
    </div>
  )
}
