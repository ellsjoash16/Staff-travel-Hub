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
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState(false)

  function handleLogin() {
    if (pwd === state.settings.password) {
      setPwd('')
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
            <Label htmlFor="login-pwd">Password</Label>
            <Input
              id="login-pwd"
              type="password"
              placeholder="Enter admin password"
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setError(false) }}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {error && (
              <p className="text-xs text-destructive">Incorrect password. Try again.</p>
            )}
          </div>
          <Button className="w-full" onClick={handleLogin}>
            Login
          </Button>
          <p className="text-xs text-muted-foreground">
            Default password: <strong>admin123</strong>
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
