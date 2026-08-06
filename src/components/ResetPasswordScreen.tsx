import { useState, useEffect } from 'react'
import { CircleNotch, CheckCircle, WarningCircle, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80'

type Phase = 'verifying' | 'ready' | 'invalid' | 'done'

export function ResetPasswordScreen({ oobCode }: { oobCode: string }) {
  const [phase, setPhase]     = useState<Phase>('verifying')
  const [email, setEmail]     = useState('')
  const [next, setNext]       = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow]       = useState(false)
  const [busy, setBusy]       = useState(false)

  // Validate the reset code up front so we can greet the user and fail early on
  // an expired/used link.
  useEffect(() => {
    verifyPasswordResetCode(auth, oobCode)
      .then(mail => { setEmail(mail); setPhase('ready') })
      .catch(() => setPhase('invalid'))
  }, [oobCode])

  function backToLogin() {
    window.location.assign('/')
  }

  async function handleSubmit() {
    if (next.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (next !== confirm) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      await confirmPasswordReset(auth, oobCode, next)
      setPhase('done')
    } catch {
      toast.error('This reset link has expired or already been used — request a new one.')
      setPhase('invalid')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center px-6 py-10 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <img src={BG} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-black/70" />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Brand header — logo + wordmark alignment mirrors LoginScreen (font-gilbert
            sits high in its line box, so the wordmark is nudged down to baseline-align). */}
        <div className="flex items-center gap-2.5 px-7 pt-7 pb-2">
          {/* Logo art is white; invert it to black on the light card, leave white on the dark card */}
          <img src="/daf-logo.png" alt="DAF" className="h-9 w-9 object-contain invert dark:invert-0" style={{ transform: 'translateX(2px)' }} />
          <span className="font-gilbert text-2xl text-foreground tracking-wide leading-none" style={{ transform: 'translate(-3px, 4px)' }}>DAFAGRAM</span>
        </div>

        <div className="px-7 pb-7 pt-3">
          {phase === 'verifying' && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <CircleNotch className="h-7 w-7 animate-spin text-primary/60 mb-3" />
              <p className="text-sm">Checking your reset link…</p>
            </div>
          )}

          {phase === 'invalid' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <WarningCircle className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="font-gilbert text-xl mb-1">Link expired</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                This password reset link is invalid, expired or has already been used. Head back and request a new one.
              </p>
              <Button onClick={backToLogin} className="w-full">Back to sign in</Button>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex flex-col items-center text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <h2 className="font-gilbert text-xl mb-1">Password updated</h2>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs">
                Your password has been changed. You can now sign in with your new password.
              </p>
              <Button onClick={backToLogin} className="w-full">Continue to sign in</Button>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Set a new password</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-5">
                For <span className="font-medium text-foreground">{email}</span>
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>New password</Label>
                  <div className="relative">
                    <Input
                      type={show ? 'text' : 'password'}
                      placeholder="Min. 6 characters"
                      value={next}
                      onChange={e => setNext(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={show ? 'Hide password' : 'Show password'}
                    >
                      {show ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm new password</Label>
                  <Input
                    type={show ? 'text' : 'password'}
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  />
                </div>
                <Button onClick={handleSubmit} disabled={busy} className="w-full gap-2 mt-1">
                  {busy ? <><CircleNotch className="h-4 w-4 animate-spin" /> Updating…</> : 'Set new password'}
                </Button>
                <button
                  onClick={backToLogin}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                >
                  Cancel and return to sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
