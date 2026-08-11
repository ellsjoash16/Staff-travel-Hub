import { useState } from 'react'
import { PaperPlaneTilt, CheckCircle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { auth } from '@/lib/firebase'
import { titleCase } from '@/lib/utils'

const ADMIN_EMAIL = 'famadmin@dialaflight.co.uk'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prefillMessage?: string
}

export function ContactAdminDialog({ open, onOpenChange, prefillMessage = '' }: Props) {
  const [message, setMessage] = useState(prefillMessage)
  const [sent, setSent] = useState(false)

  function handleOpenChange(val: boolean) {
    if (!val) {
      setMessage(prefillMessage)
      setSent(false)
    }
    onOpenChange(val)
  }

  // Opens the user's own email app pre-filled to the admin. Sends from their
  // real address, so there's no mail server / domain to configure.
  function handleSend() {
    if (!message.trim()) { toast.error('Please enter a message'); return }
    const user = auth.currentUser
    const name = titleCase(user?.displayName || '') || user?.email || 'Staff member'
    const subject = `Message from ${name} — DAFAGRAM`
    window.location.href = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    setSent(true)
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
              <h3 className="font-gilbert text-xl mb-1">Email ready to send</h3>
              <p className="text-sm text-muted-foreground mb-4 sm:mb-5">Your email app has opened with your message — just press send there and an admin will reply to you directly.</p>
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
              <p className="text-xs text-muted-foreground">This opens your email app with the message ready to send to the admin team.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => handleOpenChange(false)}>Cancel</Button>
                <Button size="sm" onClick={handleSend} className="gap-2">
                  <PaperPlaneTilt className="h-4 w-4" /> Compose email
                </Button>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
