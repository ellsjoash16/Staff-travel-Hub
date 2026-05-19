import { useState } from 'react'
import { Loader2, Send, CheckCircle } from 'lucide-react'
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Admin</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {sent ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-gilbert text-xl mb-1">Message sent</h3>
              <p className="text-sm text-muted-foreground mb-5">An admin will get back to you via email.</p>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Your message</Label>
                <Textarea
                  placeholder="Describe your query or issue…"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={5}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">An admin will reply to your email address.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button onClick={handleSend} disabled={sending} className="gap-2">
                  {sending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</>
                    : <><Send className="h-4 w-4" /> Send</>
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
