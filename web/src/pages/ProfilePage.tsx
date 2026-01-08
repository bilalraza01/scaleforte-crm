import { useEffect, useState } from "react"
import { useAuth } from "@/auth/AuthProvider"
import { useUpdateUser, useChangeOwnPassword } from "@/api/users"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input, Label, FieldError } from "@/components/ui/Input"
import type { ApiError } from "@/lib/http"

export function ProfilePage() {
  const { user, refresh } = useAuth()
  const updateUser = useUpdateUser(user?.id ?? 0)
  const changePassword = useChangeOwnPassword()

  const [name, setName] = useState("")
  const [savedName, setSavedName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPwd, setCurrentPwd] = useState("")
  const [newPwd, setNewPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)
  const [fieldError, setFieldError] = useState<{ field: string; msg: string } | null>(null)

  useEffect(() => {
    if (user) setName(user.name)
  }, [user?.id])

  if (!user) return null

  const onSaveName = async () => {
    setNameError(null)
    setSavedName(false)
    try {
      await updateUser.mutateAsync({ name })
      // Refresh /me so AuthProvider's user.name updates the sidebar chip too.
      await refresh()
      setSavedName(true)
      setTimeout(() => setSavedName(false), 1500)
    } catch (err) {
      const e = err as ApiError
      setNameError(e.response?.data?.error ?? "Could not save")
    }
  }

  const onChangePassword = async () => {
    setPwdError(null)
    setFieldError(null)
    setPwdSaved(false)
    if (newPwd.length < 8) return setFieldError({ field: "new", msg: "At least 8 characters" })
    if (newPwd !== confirmPwd) return setFieldError({ field: "confirm", msg: "Passwords don't match" })
    try {
      await changePassword.mutateAsync({ current_password: currentPwd, new_password: newPwd })
      setPwdSaved(true)
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("")
      setTimeout(() => setPwdSaved(false), 2500)
    } catch (err) {
      const e = err as ApiError
      const errs = e.response?.data?.errors as Record<string, string[]> | undefined
      if (errs?.current_password) {
        setFieldError({ field: "current", msg: errs.current_password.join(", ") })
      } else if (errs) {
        setPwdError(Object.entries(errs).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · "))
      } else {
        setPwdError(e.response?.data?.error ?? "Could not change password")
      }
    }
  }

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <PageHeader title="My profile" subtitle="Your account details and password." />

      <Card className="mb-4">
        <CardHeader title="Your details" />
        <CardBody className="space-y-3">
          {savedName && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2 rounded-md">Saved.</div>
          )}
          {nameError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2 rounded-md">{nameError}</div>
          )}
          <div>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled />
            <FieldError>Email is your login identity and can't be changed here.</FieldError>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label>Role</Label>
              <p className="capitalize text-slate-700">{user.role}</p>
            </div>
            <div>
              <Label>Workspaces</Label>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {user.workspace_access.length === 0
                  ? <span className="text-slate-400">none</span>
                  : user.workspace_access.map((w) => (
                    <span key={w} className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-xs capitalize">{w}</span>
                  ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button onClick={onSaveName} disabled={updateUser.isPending || name === user.name}>
              {updateUser.isPending ? "Saving…" : "Save name"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Change password" subtitle="You'll need your current password to confirm." />
        <CardBody className="space-y-3">
          {pwdSaved && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-2.5 rounded-md">
              Password changed. Use the new one next time you sign in.
            </div>
          )}
          {pwdError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-900 text-sm p-2.5 rounded-md">{pwdError}</div>
          )}
          <div>
            <Label htmlFor="cur">Current password</Label>
            <Input
              id="cur"
              type="password"
              autoComplete="current-password"
              value={currentPwd}
              onChange={(e) => setCurrentPwd(e.target.value)}
            />
            {fieldError?.field === "current" && <FieldError>{fieldError.msg}</FieldError>}
          </div>
          <div>
            <Label htmlFor="new">New password</Label>
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
            />
            {fieldError?.field === "new" && <FieldError>{fieldError.msg}</FieldError>}
          </div>
          <div>
            <Label htmlFor="conf">Confirm new password</Label>
            <Input
              id="conf"
              type="password"
              autoComplete="new-password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
            />
            {fieldError?.field === "confirm" && <FieldError>{fieldError.msg}</FieldError>}
          </div>
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              onClick={onChangePassword}
              disabled={changePassword.isPending || !currentPwd || !newPwd || !confirmPwd}
            >
              {changePassword.isPending ? "Updating…" : "Change password"}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
