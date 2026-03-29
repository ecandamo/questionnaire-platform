"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { BuildingIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, SearchIcon, TrashIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface Client {
  id: string
  name: string
  industry: string | null
  contactName: string | null
  contactEmail: string | null
  createdAt: string
}

export default function ClientsPage() {
  const [clients, setClients] = React.useState<Client[]>([])
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [showDialog, setShowDialog] = React.useState(false)
  const [editing, setEditing] = React.useState<Client | null>(null)
  const [form, setForm] = React.useState({ name: "", industry: "", contactName: "", contactEmail: "" })
  const [saving, setSaving] = React.useState(false)

  async function load() {
    setLoading(true)
    const params = search ? `?search=${encodeURIComponent(search)}` : ""
    const res = await fetch(`/api/clients${params}`)
    if (res.ok) setClients(await res.json())
    setLoading(false)
  }

  React.useEffect(() => { load() }, [search])

  function openAdd() {
    setEditing(null)
    setForm({ name: "", industry: "", contactName: "", contactEmail: "" })
    setShowDialog(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setForm({
      name: c.name,
      industry: c.industry ?? "",
      contactName: c.contactName ?? "",
      contactEmail: c.contactEmail ?? "",
    })
    setShowDialog(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return }
    setSaving(true)
    const url = editing ? `/api/clients/${editing.id}` : "/api/clients"
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success(editing ? "Client updated" : "Client created")
      setShowDialog(false)
      load()
    } else {
      toast.error("Failed to save client")
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this client?")) return
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Client removed"); load() }
    else toast.error("Failed to remove")
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your prospect and client accounts</p>
        </div>
        <Button onClick={openAdd}>
          <PlusIcon className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <BuildingIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No clients yet</p>
              <Button size="sm" onClick={openAdd}>
                <PlusIcon className="h-4 w-4" />
                Add your first client
              </Button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Industry</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Added</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.industry ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.contactName ? (
                        <span>
                          {c.contactName}
                          {c.contactEmail && <span className="text-xs ml-1">({c.contactEmail})</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(c.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <PencilIcon className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(c.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <TrashIcon className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "Add Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Industry</Label>
              <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Technology, Finance, etc." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="jane@acme.com" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              {editing ? "Save Changes" : "Add Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
