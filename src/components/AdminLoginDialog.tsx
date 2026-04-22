import { useState } from 'react'
import { Lock } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/context/AppContext'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AdminLoginDialog({ open, onOpenChange, onSuccess }: Props) {
  const { state } = useApp()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  function handleLogin() {
    if (pin === state.settings.password) {
      setPin('')
      setError(false)
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Admin Login
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-pin">Admin PIN</Label>
            <Input
              id="login-pin"
              type="password"
              placeholder="Enter PIN"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive">Incorrect PIN. Try again.</p>
            )}
          </div>
          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
