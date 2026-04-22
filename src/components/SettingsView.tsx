import { useState } from 'react'
import { toast } from 'sonner'
import { Shield, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useApp } from '@/context/AppContext'

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export function SettingsView() {
  const { state, promoteToAdmin } = useApp()
  const { isAdmin } = state

  const [adminPin, setAdminPin] = useState('')
  const [promoting, setPromoting] = useState(false)

  async function handlePromote(e: React.FormEvent) {
    e.preventDefault()
    if (!adminPin) {
      toast.error('Enter the admin PIN')
      return
    }
    setPromoting(true)
    try {
      const success = await promoteToAdmin(adminPin)
      if (success) {
        toast.success('Admin access activated!')
        setAdminPin('')
      } else {
        toast.error('Incorrect PIN')
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to activate admin')
    } finally {
      setPromoting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="font-outfit font-bold text-2xl mb-1">Settings</h1>
      </div>

      <SectionCard title="Admin Access" icon={Shield}>
        {isAdmin ? (
          <div className="flex items-center gap-2.5 py-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium text-sm">Admin access active</p>
              <p className="text-xs text-muted-foreground">You have full admin privileges</p>
            </div>
            <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
              Admin
            </span>
          </div>
        ) : (
          <form onSubmit={handlePromote} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the admin PIN to gain admin privileges.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="admin-pin">Admin PIN</Label>
              <Input
                id="admin-pin"
                type="password"
                value={adminPin}
                onChange={e => setAdminPin(e.target.value)}
                placeholder="Enter PIN"
                disabled={promoting}
              />
            </div>
            <Button type="submit" variant="outline" disabled={promoting} className="gap-2">
              {promoting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</>
                : <><Shield className="h-4 w-4" /> Activate Admin Access</>
              }
            </Button>
          </form>
        )}
      </SectionCard>
    </div>
  )
}
