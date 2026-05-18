import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { CheckCircle, ChevronLeft, ChevronRight, Send, Loader2, Plane, Ban, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppSelect } from '@/components/ui/app-select'
import { Textarea } from '@/components/ui/textarea'
import { auth } from '@/lib/firebase'
import { insertRegistration, fetchUserProfile, upsertUserProfile } from '@/lib/db'

const JOB_ROLES = ['Travel Manager', 'NTM', 'DTM', 'Sales Manager', 'DSM', 'Admin', 'Director', 'RSM']
import { useApp } from '@/context/AppContext'
import type { Trip, NominatedPerson } from '@/lib/types'

type Phase = 'loading' | 'confirm' | 'passport' | 'nominate' | 'questions' | 'banned'

interface Props {
  trip: Trip
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Confirmed',
  refused: 'Refused',
}

const NOMINATING_ROLES = ['DSM', 'RSM']

export function RegisterInterestDialog({ trip, open, onOpenChange }: Props) {
  const { state, loadMyRegistrations } = useApp()
  const existingReg = state.myRegistrations.find(r => r.tripId === trip.id)
  const [phase, setPhase]               = useState<Phase>('loading')
  const [passportFirst, setPassportFirst] = useState('')
  const [passportLast, setPassportLast]   = useState('')
  const [jobRole, setJobRole]             = useState('')
  const [salesDivision, setSalesDivision] = useState('')
  const [nominatedPeople, setNominatedPeople] = useState<NominatedPerson[]>([])
  const [visitedBefore, setVisitedBefore]     = useState<boolean | null>(null)
  const [visitedWhen, setVisitedWhen]         = useState('')
  const [keyLevel, setKeyLevel]               = useState<'key' | 'super_key' | null>(null)
  const [inspiration, setInspiration]         = useState('')
  const [whyChooseYou, setWhyChooseYou]       = useState('')
  const [submitting, setSubmitting]           = useState(false)
  const [submitted, setSubmitted]             = useState(false)

  // Saved profile for confirm screen
  const [savedProfile, setSavedProfile] = useState<{
    firstName: string; lastName: string
    passportFirstName: string; passportLastName: string
    jobRole: string | null
    salesDivision: string | null
    medicalInfo: string | null
  } | null>(null)

  useEffect(() => {
    if (!open) return
    const user = auth.currentUser
    if (!user) return

    setPhase('loading')
    setSavedProfile(null)

    fetchUserProfile(user.uid).then(profile => {
      if (profile?.banned) {
        setPhase('banned' as Phase)
        return
      }
      if (profile && profile.dataConsent) {
        setSavedProfile(profile)
        setPhase('confirm')
      } else {
        const parts = (user.displayName ?? '').split(' ')
        if (parts[0]) setPassportFirst(f => f || parts[0])
        if (profile?.jobRole) setJobRole(profile.jobRole)
        if (profile?.salesDivision) setSalesDivision(profile.salesDivision)
        setPhase('passport')
      }
    }).catch(() => setPhase('passport'))
  }, [open])

  function reset() {
    setPhase('loading'); setSavedProfile(null)
    setPassportFirst(''); setPassportLast(''); setJobRole(''); setSalesDivision('')
    setNominatedPeople([])
    setVisitedBefore(null); setVisitedWhen(''); setKeyLevel(null)
    setInspiration(''); setWhyChooseYou('')
    setSubmitting(false); setSubmitted(false)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  function addNominee() {
    setNominatedPeople(p => [...p, { name: '', email: '' }])
  }

  function updateNominee(i: number, field: keyof NominatedPerson, val: string) {
    setNominatedPeople(p => p.map((n, idx) => idx === i ? { ...n, [field]: val } : n))
  }

  function removeNominee(i: number) {
    setNominatedPeople(p => p.filter((_, idx) => idx !== i))
  }

  async function sendRegEmail(to: string, name: string, tripName: string) {
    auth.currentUser?.getIdToken().then(token => {
      fetch('/api/send-registration-email', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'registered', to, name, tripName }),
      }).catch(() => {})
    }).catch(() => {})
  }

  function questionAnswers() {
    return {
      visitedBefore: visitedBefore ?? null,
      visitedWhen: visitedBefore ? (visitedWhen.trim() || null) : null,
      keyLevel: keyLevel ?? null,
      destinationInspiration: inspiration.trim() || null,
      whyChooseYou: whyChooseYou.trim() || null,
    }
  }

  async function doSubmit(
    reg: Parameters<typeof insertRegistration>[0],
    profile: { uid: string; jobRole: string | null; salesDivision: string | null; firstName: string; lastName: string; passportFirstName: string; passportLastName: string; medicalInfo: string | null; consent: boolean } | null
  ) {
    await insertRegistration({ ...reg, ...questionAnswers() })
    sendRegEmail(reg.email, reg.firstName, reg.tripName)
    if (profile?.consent) {
      await upsertUserProfile({
        uid: profile.uid,
        authEmail: auth.currentUser?.email ?? null,
        authDisplayName: auth.currentUser?.displayName ?? null,
        jobRole: profile.jobRole,
        salesDivision: profile.salesDivision,
        firstName: profile.firstName,
        lastName: profile.lastName,
        passportFirstName: profile.passportFirstName,
        passportLastName: profile.passportLastName,
        medicalInfo: profile.medicalInfo,
        dataConsent: true,
      })
    }
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#05979a','#07c5b0','#064e5a','#f59e0b','#ffffff','#34d399'] })
    await loadMyRegistrations()
    setSubmitted(true)
  }

  async function submitFromConfirm() {
    const user = auth.currentUser
    if (!user || !savedProfile) return
    setSubmitting(true)
    try {
      const email = user.email ?? ''
      await insertRegistration({
        id: crypto.randomUUID(),
        tripId: trip.id, tripName: trip.name,
        uid: user.uid,
        email,
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
        passportFirstName: savedProfile.passportFirstName,
        passportLastName: savedProfile.passportLastName,
        medicalInfo: savedProfile.medicalInfo,
        dataConsent: true,
        status: 'requested',
        jobRole: savedProfile.jobRole,
        salesDivision: savedProfile.salesDivision,
        nominatedPeople,
        ...questionAnswers(),
      })
      sendRegEmail(email, savedProfile.firstName, trip.name)
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#05979a','#07c5b0','#064e5a','#f59e0b','#ffffff','#34d399'] })
      await loadMyRegistrations()
      setSubmitted(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  async function handleSubmit() {
    if (!passportFirst.trim() || !passportLast.trim()) {
      toast.error('Passport name is required'); return
    }
    if (!jobRole) {
      toast.error('Please select your job role'); return
    }
    const user = auth.currentUser
    if (!user) { toast.error('Not signed in'); return }
    setSubmitting(true)
    try {
      const reg = {
        id: crypto.randomUUID(),
        tripId: trip.id, tripName: trip.name,
        uid: user.uid,
        email: user.email ?? '',
        firstName: passportFirst.trim() || (user.displayName ?? '').split(' ')[0] || '',
        lastName: passportLast.trim() || (user.displayName ?? '').split(' ').slice(1).join(' ') || '',
        passportFirstName: passportFirst.trim(),
        passportLastName: passportLast.trim(),
        medicalInfo: null,
        dataConsent: false,
        status: 'requested' as const,
        jobRole: jobRole || null,
        salesDivision: salesDivision.trim() || null,
        nominatedPeople,
      }
      await doSubmit(reg, null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  const tripBanner = (
    <div className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/15 p-3">
      {trip.image
        ? <img src={trip.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
        : <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Plane className="h-4 w-4 text-primary/50" /></div>
      }
      <div className="min-w-0">
        <p className="font-semibold text-sm truncate">{trip.name}</p>
        {trip.date && <p className="text-xs text-muted-foreground">{new Date(trip.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
      </div>
    </div>
  )

  const passportFields = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>First Name <span className="text-destructive">*</span></Label>
          <Input placeholder="As on passport" value={passportFirst} onChange={e => setPassportFirst(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1.5">
          <Label>Last Name <span className="text-destructive">*</span></Label>
          <Input placeholder="As on passport" value={passportLast} onChange={e => setPassportLast(e.target.value)} />
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
        <Label>Sales Division <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input placeholder="e.g. North, South, Midlands…" value={salesDivision} onChange={e => setSalesDivision(e.target.value)} />
      </div>
    </div>
  )


  const nominateFields = (activeRole: string | null) => (
    <div className="space-y-3">
      <div>
        <h3 className="font-gilbert text-base">Nominate from your division</h3>
        <p className="text-xs text-muted-foreground mt-0.5">As a {activeRole}, you can nominate colleagues from your division to register.</p>
      </div>
      {nominatedPeople.length === 0 && (
        <p className="text-sm text-muted-foreground">No nominations added yet.</p>
      )}
      {nominatedPeople.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <Input
              placeholder="Full name"
              value={n.name}
              onChange={e => updateNominee(i, 'name', e.target.value)}
            />
            <Input
              placeholder="Email (optional)"
              value={n.email}
              onChange={e => updateNominee(i, 'email', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => removeNominee(i)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={addNominee} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" /> Add person
      </Button>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Register Interest</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {existingReg ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-gilbert text-xl mb-1">Already Registered</h3>
              <p className="text-sm text-muted-foreground mb-4">You've already registered interest for <span className="font-medium text-foreground">{trip.name}</span>.</p>
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium">
                Status: <span className="text-primary">{STATUS_LABELS[existingReg.status] ?? existingReg.status}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Check <strong>My Registrations</strong> in the sidebar to track your status.</p>
              <Button variant="secondary" className="mt-5" onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          ) : submitted ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="font-gilbert text-xl mb-1">You're registered!</h3>
              <p className="text-sm text-muted-foreground mb-5">
                We've noted your interest in <span className="font-medium text-foreground">{trip.name}</span>. The admin team will be in touch.
              </p>
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4">
              {tripBanner}

              {/* Loading */}
              {phase === 'loading' && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {/* Banned */}
              {phase === ('banned' as Phase) && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                    <Ban className="h-8 w-8 text-destructive" />
                  </div>
                  <h3 className="font-gilbert text-xl mb-1">Registration Unavailable</h3>
                  <p className="text-sm text-muted-foreground mb-5">You are not permitted to register interest in trips. Please contact an admin if you think this is a mistake.</p>
                  <Button variant="secondary" onClick={() => handleOpenChange(false)}>Close</Button>
                </div>
              )}

              {/* Confirm — saved profile exists */}
              {phase === 'confirm' && savedProfile && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
                    <p className="font-semibold">{savedProfile.firstName} {savedProfile.lastName}</p>
                    <p className="text-muted-foreground">{savedProfile.passportFirstName} {savedProfile.passportLastName}</p>
                    {savedProfile.jobRole && <p className="text-muted-foreground">{savedProfile.jobRole}{savedProfile.salesDivision ? ` · ${savedProfile.salesDivision}` : ''}</p>}
                    {savedProfile.medicalInfo && (
                      <p className="text-amber-600 dark:text-amber-400">Medical: {savedProfile.medicalInfo}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Your saved details will be used for this registration.</p>
                  <Button onClick={() => setPhase(savedProfile.jobRole && NOMINATING_ROLES.includes(savedProfile.jobRole) ? 'nominate' : 'questions')} className="w-full gap-2">
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Passport — no saved profile */}
              {phase === 'passport' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-gilbert text-base">Your details</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Required for all travel bookings</p>
                  </div>
                  {passportFields}
                  <div className="flex justify-end pt-1">
                    <Button onClick={() => {
                      if (!passportFirst.trim() || !passportLast.trim()) { toast.error('Passport name is required'); return }
                      if (!jobRole) { toast.error('Please select your job role'); return }
                      setPhase(NOMINATING_ROLES.includes(jobRole) ? 'nominate' : 'questions')
                    }} className="gap-1.5">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Nominate */}
              {phase === 'nominate' && (
                <div className="space-y-4">
                  {nominateFields(savedProfile?.jobRole ?? jobRole)}
                  <div className="flex justify-between pt-1">
                    <Button variant="ghost" onClick={() => setPhase(savedProfile ? 'confirm' : 'passport')} className="gap-1.5">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setPhase('questions')} className="gap-1.5">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Questions */}
              {phase === 'questions' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-gilbert text-base">A few questions</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">All optional — takes 30 seconds</p>
                  </div>

                  {/* Visited before */}
                  <div className="space-y-2">
                    <Label>Have you visited this destination before?</Label>
                    <div className="flex gap-2">
                      {([true, false] as const).map(val => (
                        <button
                          key={String(val)}
                          type="button"
                          onClick={() => { setVisitedBefore(v => v === val ? null : val); if (!val) setVisitedWhen('') }}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${visitedBefore === val ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          {val ? 'Yes' : 'No'}
                        </button>
                      ))}
                    </div>
                    {visitedBefore === true && (
                      <Input placeholder="When? e.g. 2019, summer 2022…" value={visitedWhen} onChange={e => setVisitedWhen(e.target.value)} />
                    )}
                  </div>

                  {/* Key level */}
                  <div className="space-y-2">
                    <Label>Are you Key or Super Key?</Label>
                    <div className="flex gap-2">
                      {(['key', 'super_key'] as const).map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setKeyLevel(k => k === val ? null : val)}
                          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${keyLevel === val ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                        >
                          {val === 'key' ? 'Key' : 'Super Key'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Inspiration */}
                  <div className="space-y-1.5">
                    <Label>What inspires you about this destination? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea placeholder="Tell us what excites you about this trip…" value={inspiration} onChange={e => setInspiration(e.target.value)} rows={3} />
                  </div>

                  {/* Why choose you */}
                  <div className="space-y-1.5">
                    <Label>Why should we choose you? <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea placeholder="What makes you the right person for this trip…" value={whyChooseYou} onChange={e => setWhyChooseYou(e.target.value)} rows={3} />
                  </div>

                  <div className="flex justify-between pt-1">
                    <Button variant="ghost" onClick={() => setPhase(NOMINATING_ROLES.includes(savedProfile?.jobRole ?? jobRole) ? 'nominate' : savedProfile ? 'confirm' : 'passport')} className="gap-1.5">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <Button onClick={savedProfile ? submitFromConfirm : handleSubmit} disabled={submitting} className="gap-2">
                      {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Send className="h-4 w-4" /> Register Interest</>}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
