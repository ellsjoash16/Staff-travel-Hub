import { useState } from 'react'
import { CircleNotch, PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { auth } from '@/lib/firebase'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillMessage?: string
}

export function ContactAdminDialog({ open, onOpenChange, prefillMessage = '' }: Props) {
  const [message, setMessage] = useState(prefillMessage)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  function handleOpenChange(val: boolean) {
    if (!val) {
      setMessage(prefillMessage)
      setSending(false)
      setSent(false)
    }
    onOpenChange(val)
  }

  async function handleSend() {
    if (!message.trim()) { toast.error('Please enter a message'); return }
    const user = auth.currentUser
    if (!user) { toast.error('Not signed in'); return }
    setSending(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/contact-admin', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromName: user.displayName || user.email || 'Unknown',
          fromEmail: user.email || '',
          message,
        }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setSent(true)
    } catch {
      toast.error('Failed to send — please try again')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent mobileSheet className="max-w-md">
        <DialogHeader className="p-4 pb-0 sm:p-6 sm:pb-0">
          <DialogTitle>Contact Admin</DialogTitle>
        </DialogHeader>
        <DialogBody className="p-4 sm:p-6">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 sm:mb-4">
                <CheckCircle className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500" />
              </div>
              <h3 className="font-gilbert text-xl mb-1">Message sent</h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-5">An admin will get back to you via email.</p>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-1.5">
                <Label>Your message</Label>
                <Textarea
                  placeholder="Describe your query or issue…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  autoFocus
                  className="resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">An admin will reply to your email address.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSend} disabled={sending} className="gap-2">
                  {sending
                    ? <><CircleNotch className="h-4 w-4 animate-spin" /> Sending…</>
                    : <><PaperPlaneTilt className="h-4 w-4" /> Send</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
