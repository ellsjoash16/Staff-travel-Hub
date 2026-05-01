import { useState } from 'react'
import { Loader2, LogIn, UserPlus, Plane } from 'lucide-react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile } from 'firebase/auth'
import { auth, microsoftProvider } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80'

type Mode = 'signin' | 'signup'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [busy, setBusy]           = useState(false)

  async function handleSignIn() {
    if (!email.trim() || !password) { toast.error('Enter your email and password'); return }
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
        toast.error('No account found with those details')
      } else if (code === 'auth/wrong-password') {
        toast.error('Incorrect password')
      } else {
        toast.error('Sign in failed — please try again')
      }
    } finally { setBusy(false) }
  }

  async function handleSignUp() {
    if (!firstName.trim() || !lastName.trim()) { toast.error('Enter your first and last name'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Enter a valid email address'); return }
    if (!email.trim().toLowerCase().endsWith('@dialaflight.co.uk')) { toast.error('You must use your @dialaflight.co.uk email to sign up'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirmPwd) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(cred.user, { displayName: `${firstName.trim()} ${lastName.trim()}` })
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code === 'auth/email-already-in-use') {
        toast.error('An account already exists with this email — sign in instead')
      } else {
        toast.error('Account creation failed — please try again')
      }
    } finally { setBusy(false) }
  }

  async function handleMicrosoft() {
    setBusy(true)
    try {
      const cred = await signInWithPopup(auth, microsoftProvider)
      if (!cred.user.email?.toLowerCase().endsWith('@dialaflight.co.uk')) {
        await cred.user.delete()
        toast.error('You must use your @dialaflight.co.uk account')
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user') toast.error('Microsoft sign-in failed')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(12px) brightness(0.4) saturate(1.1)',
          transform: 'scale(1.1)',
        }} />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 backdrop-blur-sm mb-4">
            <Plane className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-gilbert text-3xl text-white drop-shadow">DAFAGRAM</h1>
          <p className="text-white/60 text-sm mt-1">Staff Travel Hub</p>
        </div>

        <div className="bg-card/90 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-white/10">
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-muted p-1 mb-5">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${mode === 'signin' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-all ${mode === 'signup' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Create Account
            </button>
          </div>

          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First Name</Label>
                  <Input placeholder="Sarah" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name</Label>
                  <Input placeholder="Johnson" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleSignIn() : handleSignUp())}
              />
            </div>

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Label>Confirm Password</Label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPwd}
                  onChange={e => setConfirmPwd(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSignUp()}
                />
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={busy}
            >
              {busy
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'signin'
                  ? <><LogIn className="h-4 w-4" /> Sign In</>
                  : <><UserPlus className="h-4 w-4" /> Create Account</>
              }
            </Button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button variant="outline" className="w-full gap-2" onClick={handleMicrosoft} disabled={busy}>
              <svg className="h-4 w-4" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z"/><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
              Continue with Microsoft
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
