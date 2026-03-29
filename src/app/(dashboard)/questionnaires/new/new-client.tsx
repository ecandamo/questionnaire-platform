"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2Icon, ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { toast } from "sonner"
import { QUESTIONNAIRE_TYPE_LABELS, type QuestionnaireType } from "@/types"

interface Client {
  id: string
  name: string
}

interface Template {
  id: string
  name: string
  type: string
}

export function NewQuestionnaireClient() {
  const router = useRouter()
  const [step, setStep] = React.useState(1)
  const [title, setTitle] = React.useState("")
  const [type, setType] = React.useState<QuestionnaireType | "">("")
  const [clientId, setClientId] = React.useState("")
  const [clients, setClients] = React.useState<Client[]>([])
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([c, t]) => {
      setClients(c ?? [])
      setTemplates(t ?? [])
    })
  }, [])

  async function handleCreate() {
    if (!title || !type) {
      toast.error("Please fill in all required fields")
      return
    }
    setLoading(true)

    const matchingTemplate = templates.find((t) => t.type === type && type !== "custom")

    const res = await fetch("/api/questionnaires", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type,
        clientId: clientId || null,
        templateId: matchingTemplate?.id ?? null,
      }),
    })

    if (res.ok) {
      const q = await res.json()
      toast.success("Questionnaire created")
      router.push(`/questionnaires/${q.id}`)
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to create")
      setLoading(false)
    }
  }

  const typeOptions = Object.entries(QUESTIONNAIRE_TYPE_LABELS) as [QuestionnaireType, string][]

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" onClick={() => router.back()}>
          <ArrowLeftIcon className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">New Questionnaire</h1>
          <p className="text-sm text-muted-foreground">Configure your questionnaire settings</p>
        </div>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-heading text-base">Questionnaire Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Acme Corp — Q2 Data Request"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>
              Type <span className="text-destructive">*</span>
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as QuestionnaireType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select questionnaire type" />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {type && type !== "custom" && (
              <p className="text-xs text-muted-foreground">
                This will pre-populate questions from the{" "}
                <span className="font-medium">{QUESTIONNAIRE_TYPE_LABELS[type]}</span> template.
              </p>
            )}
            {type === "custom" && (
              <p className="text-xs text-muted-foreground">
                You&apos;ll select questions from the question bank in the builder.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Client / Account</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!title || !type || loading}>
              {loading && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Create &amp; Open Builder
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
