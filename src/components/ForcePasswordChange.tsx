import { useState } from 'react'
import { CircleNotch, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useApp } from '@/context/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Shown to admin-created accounts on first sign-in: they must replace the
// temporary password with one of their own before using the app. Non-dismissable.
export function ForcePasswordChange() {
  const { completePasswordChange } = useApp()
  const [temp, setTemp]       = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy]       = useState(false)

  async function handleSubmit() {
    if (!temp) { toast.error('Enter the temporary password you were given'); return }
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (next !== confirm) { toast.error('Passwords do not match'); return }
    if (next === temp) { toast.error('Choose a password different from the temporary one'); return }
    const user = auth.currentUser
    if (!user?.email) { toast.error('Not signed in'); return }
    setBusy(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, temp)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, next)
      await completePasswordChange()
      toast.success('Password set — welcome to DAFAGRAM!')
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Temporary password is incorrect')
      } else {
        toast.error('Failed to set password — please try again')
      }
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center text-center px-6 pt-6 pb-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h2 className="font-gilbert text-xl leading-tight">Set your password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your account was set up with a temporary password. Please choose your own to continue.
          </p>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Temporary password</Label>
            <Input type="password" placeholder="The password you were given" value={temp} onChange={e => setTemp(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>New password</Label>
            <Input type="password" placeholder="Min. 6 characters" value={next} onChange={e => setNext(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm new password</Label>
            <Input type="password" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>
          <Button onClick={handleSubmit} disabled={busy} className="w-full gap-2 mt-1">
            {busy ? <><CircleNotch className="h-4 w-4 animate-spin" /> Setting…</> : 'Set password & continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}
