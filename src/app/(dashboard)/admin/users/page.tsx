"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Loader2Icon, MoreHorizontalIcon, PlusIcon, UsersIcon } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { authClient } from "@/lib/auth-client"

interface User {
  id: string
  name: string
  email: string
  role: string
  banned: boolean | null
  createdAt: string
}

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showDialog, setShowDialog] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({ name: "", email: "", password: "", role: "user" })

  async function load() {
    setLoading(true)
    const res = await fetch("/api/admin/users")
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  React.useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.name || !form.email || !form.password) {
      toast.error("All fields are required")
      return
    }
    setSaving(true)
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("User created")
      setShowDialog(false)
      setForm({ name: "", email: "", password: "", role: "user" })
      load()
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to create user")
    }
    setSaving(false)
  }

  async function handleBan(userId: string, banned: boolean) {
    const deactivate = !banned
    const confirmed = confirm(`${deactivate ? "Deactivate" : "Reactivate"} this user?`)
    if (!confirmed) return

    const res = deactivate
      ? await authClient.admin.banUser({ userId })
      : await authClient.admin.unbanUser({ userId })
    if (res.error) {
      toast.error("Failed to update user")
    } else {
      toast.success(deactivate ? "User deactivated" : "User reactivated")
      load()
    }
  }

  async function handleSetRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? ("user" as const) : ("admin" as const)
    const res = await authClient.admin.setRole({ userId, role: newRole })
    if (res.error) {
      toast.error("Failed to update role")
    } else {
      toast.success("Role updated")
      load()
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform users and their roles</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <PlusIcon className="h-4 w-4" />
          Create User
        </Button>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <UsersIcon className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={u.role === "admin" ? "default" : "secondary"}
                        className="text-xs capitalize"
                      >
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className={u.banned
                          ? "text-xs bg-destructive/10 text-destructive border-destructive/20"
                          : "text-xs bg-success/10 text-success border-success/20"
                        }
                      >
                        {u.banned ? "Deactivated" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleSetRole(u.id, u.role)}
                          >
                            Make {u.role === "admin" ? "User" : "Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBan(u.id, u.banned ?? false)}
                            className={u.banned ? "" : "text-destructive focus:text-destructive"}
                          >
                            {u.banned ? "Reactivate" : "Deactivate"}
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
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Temporary Password <span className="text-destructive">*</span></Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Min. 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2Icon className="h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
