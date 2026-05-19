import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [busy, setBusy]         = useState(false)
  const [done, setDone]         = useState(false)

  function handleOpenChange(val: boolean) {
    if (!val) { setCurrent(''); setNext(''); setConfirm(''); setBusy(false); setDone(false) }
    onOpenChange(val)
  }

  async function handleSubmit() {
    if (!current) { toast.error('Enter your current password'); return }
    if (next.length < 6) { toast.error('New password must be at least 6 characters'); return }
    if (next !== confirm) { toast.error('Passwords do not match'); return }
    const user = auth.currentUser
    if (!user?.email) { toast.error('Not signed in'); return }
    setBusy(true)
    try {
      const credential = EmailAuthProvider.credential(user.email, current)
      await reauthenticateWithCredential(user, credential)
      await updatePassword(user, next)
      setDone(true)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect')
      } else {
        toast.error('Failed to change password — please try again')
      }
    } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {done ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <h3 className="font-gilbert text-lg mb-1">Password updated</h3>
              <p className="text-sm text-muted-foreground mb-4">Your password has been changed successfully.</p>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Current Password</Label>
                <Input type="password" placeholder="Your current password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>New Password</Label>
                <Input type="password" placeholder="Min. 6 characters" value={next} onChange={e => setNext(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Confirm New Password</Label>
                <Input type="password" placeholder="Repeat new password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={busy} className="gap-2">
                  {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</> : 'Update Password'}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
