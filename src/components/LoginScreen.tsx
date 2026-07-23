import { useState } from 'react'
import { CircleNotch, SignIn, UserPlus, Camera, Globe, Airplane } from '@phosphor-icons/react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { auth, microsoftProvider } from '@/lib/firebase'
import { saveJobRole } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppSelect } from '@/components/ui/app-select'
import { toast } from 'sonner'

const JOB_ROLES = ['Travel Manager', 'NTM', 'DTM', 'Sales Manager', 'DSM', 'Admin', 'Director', 'RSM']

const BUILDINGS = ['London', 'Shirley', 'Boxley', 'Sale']

const DIVISIONS_BY_BUILDING: Record<string, string[]> = {
  London:  ['Supertravel', 'World Options', 'Which Flight', 'Travel Solutions'],
  Shirley: ['Red Admiral', 'Direct Line', 'International Flyer', 'World Travel Service'],
  Boxley:  ['Fare Deals', 'Flying Start', 'Flightcall', 'Travel Options'],
  Sale:    ['Manchester S', 'Manchester R', 'Manchester X'],
}

const BG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1920&q=80'

const FEATURES = [
  { Icon: Camera,   text: 'Share trip photos and stories with the team'  },
  { Icon: Globe,    text: 'Explore destinations visited by colleagues'    },
  { Icon: Airplane, text: 'Register interest in upcoming group trips'     },
]

type Mode = 'signin' | 'signup'

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [jobRole, setJobRole]       = useState('')
  const [building, setBuilding]           = useState('')
  const [salesDivision, setSalesDivision] = useState('')
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

  async function handleForgotPassword() {
    if (!email.trim()) { toast.error('Enter your email address first'); return }
    setBusy(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      toast.success('Password reset email sent — check your inbox')
    } catch {
      toast.error('Could not send reset email — check the address and try again')
    } finally { setBusy(false) }
  }

  async function handleSignUp() {
    if (!firstName.trim() || !lastName.trim()) { toast.error('Enter your first and last name'); return }
    if (!jobRole) { toast.error('Please select your job role'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { toast.error('Enter a valid email address'); return }
    if (!email.trim().toLowerCase().endsWith('@dialaflight.co.uk')) { toast.error('You must use your @dialaflight.co.uk email to sign up'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (password !== confirmPwd) { toast.error('Passwords do not match'); return }
    setBusy(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      await updateProfile(cred.user, { displayName: `${firstName.trim()} ${lastName.trim()}` })
      await saveJobRole(cred.user.uid, jobRole, salesDivision || null, building || null)
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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left: hero panel ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden">
        <img
          src={BG}
          alt=""
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/daf-logo.png" alt="DAF" className="h-9 w-9 object-contain" style={{ transform: 'translateX(3px)' }} />
            <span className="font-gilbert text-xl text-white tracking-wide">DAFAGRAM</span>
          </div>

          {/* Headline */}
          <div className="max-w-lg">
            <h1 className="text-5xl xl:text-6xl font-bold text-white leading-tight tracking-tight">
              Your adventures,<br />shared.
            </h1>
            <p className="text-white/65 text-lg mt-4 leading-relaxed max-w-sm">
              The internal hub where DAF staff share travel experiences, discover destinations, and connect as a team.
            </p>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {FEATURES.map(({ Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 p-1.5 rounded-lg bg-white/15 backdrop-blur-md border border-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_2px_8px_rgba(0,0,0,0.25)]">
                    <Icon className="h-3.5 w-3.5 text-white/90" />
                  </div>
                  <span className="text-white/70 text-xs leading-snug whitespace-nowrap">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-white/30 text-xs">© {new Date().getFullYear()} DialAFlight</p>
        </div>
      </div>

      {/* ── Right: form panel ── */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-x-hidden overflow-y-auto lg:bg-background lg:border-l lg:border-border px-6 py-10 lg:px-10 xl:px-16 min-h-screen lg:min-h-0">

        {/* Mobile: blurred background */}
        <div className="lg:hidden absolute inset-0 -z-0" style={{
          backgroundImage: `url(${BG})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(12px) brightness(0.4) saturate(1.1)',
          transform: 'scale(1.1)',
        }} />

        {/* Mobile: logo above card */}
        <div className="lg:hidden relative z-10 text-center mb-8 flex-shrink-0">
          <img src="/daf-logo.png" alt="DAF logo" className="h-20 w-20 object-contain mx-auto mb-4" style={{ transform: 'translateX(8px)' }} />
          <h1 className="font-gilbert text-3xl text-white drop-shadow">DAFAGRAM</h1>
          <p className="text-white/60 text-sm mt-1">Staff Travel Hub</p>
        </div>

        <div className="relative z-10 w-full max-w-sm">

          {/* Desktop logo + heading */}
          <div className="hidden lg:block mb-7">
            <h2 className="text-2xl font-bold text-foreground tracking-tight mb-6">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            {mode === 'signup' && (
              <p className="text-muted-foreground text-sm mt-1">Join with your company email address</p>
            )}
          </div>

          <div className="bg-card/90 backdrop-blur-md lg:bg-card lg:backdrop-blur-none rounded-2xl shadow-2xl lg:shadow-sm p-5 lg:p-5 border border-white/10 lg:border-border">
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
              <>
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
                <div className="space-y-1.5">
                  <Label>Job Role <span className="text-destructive">*</span></Label>
                  <AppSelect
                    value={jobRole}
                    onChange={setJobRole}
                    placeholder="— Select your role —"
                    options={[{ value: '', label: '— Select your role —' }, ...JOB_ROLES.map(r => ({ value: r, label: r }))]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Building <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <AppSelect
                    value={building}
                    onChange={v => { setBuilding(v); setSalesDivision('') }}
                    placeholder="— Select your building —"
                    options={[{ value: '', label: '— Select your building —' }, ...BUILDINGS.map(b => ({ value: b, label: b }))]}
                  />
                </div>
                {building && (
                  <div className="space-y-1.5">
                    <Label>Sales Division <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <AppSelect
                      value={salesDivision}
                      onChange={setSalesDivision}
                      placeholder="— Select your division —"
                      options={[{ value: '', label: '— Select your division —' }, ...(DIVISIONS_BY_BUILDING[building] ?? []).map(d => ({ value: d, label: d }))]}
                    />
                  </div>
                )}
              </>
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

            {mode === 'signin' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot your password?
                </button>
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={mode === 'signin' ? handleSignIn : handleSignUp}
              disabled={busy}
            >
              {busy
                ? <><CircleNotch className="h-4 w-4 animate-spin" /> {mode === 'signin' ? 'Signing in…' : 'Creating account…'}</>
                : mode === 'signin'
                  ? <><SignIn className="h-4 w-4" /> Sign In</>
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
    </div>
  )
}
