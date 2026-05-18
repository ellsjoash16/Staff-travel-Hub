import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { CheckCircle, ChevronLeft, ChevronRight, Send, Loader2, Plane, Ban } from 'lucide-react'
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
import type { Trip } from '@/lib/types'

type Phase = 'loading' | 'confirm' | 'passport' | 'medical' | 'banned'

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

export function RegisterInterestDialog({ trip, open, onOpenChange }: Props) {
  const { state, loadMyRegistrations } = useApp()
  const existingReg = state.myRegistrations.find(r => r.tripId === trip.id)
  const [phase, setPhase]                   = useState<Phase>('loading')
  const [passportFirst, setPassportFirst] = useState('')
  const [passportLast, setPassportLast]   = useState('')
  const [jobRole, setJobRole]             = useState('')
  const [medicalInfo, setMedicalInfo]     = useState('')
  const [dataConsent, setDataConsent]       = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [submitted, setSubmitted]           = useState(false)

  // Saved profile for confirm screen
  const [savedProfile, setSavedProfile] = useState<{
    firstName: string; lastName: string
    passportFirstName: string; passportLastName: string
    jobRole: string | null
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
        // Pre-fill name from Firebase Auth displayName if available
        const parts = (user.displayName ?? '').split(' ')
        if (parts[0]) setPassportFirst(f => f || parts[0])
        if (profile?.jobRole) setJobRole(profile.jobRole)
        setPhase('passport')
      }
    }).catch(() => setPhase('passport'))
  }, [open])

  function reset() {
    setPhase('loading'); setSavedProfile(null)
    setPassportFirst(''); setPassportLast(''); setJobRole(''); setMedicalInfo(''); setDataConsent(false)
    setSubmitting(false); setSubmitted(false)
  }

  function handleOpenChange(val: boolean) {
    if (!val) reset()
    onOpenChange(val)
  }

  async function submitDirect() {
    const user = auth.currentUser
    if (!user || !savedProfile) return
    setSubmitting(true)
    try {
      await insertRegistration({
        id: crypto.randomUUID(),
        tripId: trip.id, tripName: trip.name,
        uid: user.uid,
        email: user.email ?? '',
        firstName: savedProfile.firstName,
        lastName: savedProfile.lastName,
        passportFirstName: savedProfile.passportFirstName,
        passportLastName: savedProfile.passportLastName,
        medicalInfo: savedProfile.medicalInfo,
        dataConsent: true,
        status: 'requested',
      })
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
        medicalInfo: medicalInfo.trim() || null,
        dataConsent,
        status: 'requested' as const,
      }
      await insertRegistration(reg)
      if (dataConsent) {
        await upsertUserProfile({
          uid: user.uid,
          authEmail: user.email ?? null,
          authDisplayName: user.displayName ?? null,
          jobRole: jobRole || null,
          firstName: reg.firstName, lastName: reg.lastName,
          passportFirstName: reg.passportFirstName,
          passportLastName: reg.passportLastName,
          medicalInfo: reg.medicalInfo,
          dataConsent: true,
        })
      }
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#05979a','#07c5b0','#064e5a','#f59e0b','#ffffff','#34d399'] })
      await loadMyRegistrations()
      setSubmitted(true)
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
    </div>
  )

  const medicalFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Medical Conditions <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Textarea
          placeholder="Please list any medical conditions, allergies or requirements we should be aware of…"
          value={medicalInfo} onChange={e => setMedicalInfo(e.target.value)} rows={3} autoFocus
        />
      </div>
      <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors">
        <input type="checkbox" checked={dataConsent} onChange={e => setDataConsent(e.target.checked)}
          className="h-4 w-4 mt-0.5 rounded border-input accent-primary flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Save my details for future trips</p>
          <p className="text-xs text-muted-foreground mt-0.5">I consent to my passport and medical information being securely stored and reused for future trip registrations.</p>
        </div>
      </label>
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
                    {savedProfile.jobRole && <p className="text-muted-foreground">{savedProfile.jobRole}</p>}
                    {savedProfile.medicalInfo && (
                      <p className="text-amber-600 dark:text-amber-400">Medical: {savedProfile.medicalInfo}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Your saved details will be used for this registration.</p>
                  <Button onClick={submitDirect} disabled={submitting} className="w-full gap-2">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <><Send className="h-4 w-4" /> Register Interest</>}
                  </Button>
                </div>
              )}

              {/* Passport — no saved profile */}
              {phase === 'passport' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-gilbert text-base">Passport details</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Required for all travel bookings</p>
                  </div>
                  {passportFields}
                  <div className="flex justify-end pt-1">
                    <Button onClick={() => {
                      if (!passportFirst.trim() || !passportLast.trim()) {
                        toast.error('Passport name is required'); return
                      }
                      setPhase('medical')
                    }} className="gap-1.5">
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Medical */}
              {phase === 'medical' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-gilbert text-base">Medical & consent</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Any conditions we should be aware of</p>
                  </div>
                  {medicalFields}
                  <div className="flex justify-between pt-1">
                    <Button variant="ghost" onClick={() => setPhase('passport')} className="gap-1.5"><ChevronLeft className="h-4 w-4" /> Back</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
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
