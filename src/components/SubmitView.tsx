import { useState } from 'react'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import {
  Send, Loader2, CheckCircle, Plane, ChevronRight, ChevronLeft,
  User, MapPin, Camera, PenLine, Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MultiImageUpload } from './MultiImageUpload'
import { DatePicker } from './DatePicker'
import { ReviewExtras } from './ReviewExtras'
import { BlogEditor } from './BlogEditor'
import { useApp } from '@/context/AppContext'
import { today } from '@/lib/utils'
import type { PostExtras } from '@/lib/types'

const EMPTY_EXTRAS: PostExtras = { airlines: [], hotels: [], cruises: [], activities: [], dmcs: [] }

const STEPS = [
  { id: 1, label: 'You',     icon: User,    title: "Who's submitting?",    subtitle: 'Just your name so we know who to credit' },
  { id: 2, label: 'Trip',    icon: MapPin,  title: 'Where did you go?',    subtitle: 'Tell us about your trip' },
  { id: 3, label: 'Photos',  icon: Camera,  title: 'Add some photos',      subtitle: 'Between 4 and 10 photos of your trip' },
  { id: 4, label: 'Ratings', icon: Star,    title: 'Rate your experience', subtitle: 'Hotels, airlines & more — all optional' },
  { id: 5, label: 'Review',  icon: PenLine, title: 'Your overall review',  subtitle: 'A summary of your trip experience' },
]

// ── Progress indicator ───────────────────────────────────────────────────────

function StepProgress({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 select-none">
      {STEPS.map((step, i) => {
        const done   = current > step.id
        const active = current === step.id
        const Icon   = step.icon
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                done
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 ring-2 ring-emerald-500/30 ring-offset-1 ring-offset-background'
                  : active
                    ? 'bg-primary/15 border-2 border-primary text-primary'
                    : 'bg-muted border-2 border-border text-muted-foreground'
              }`}
              style={done ? { transform: 'rotate(-4deg)' } : undefined}
              >
                {done ? <CheckCircle className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-[10px] font-medium transition-colors ${active ? 'text-primary' : done ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                {done ? '✓ ' : ''}{step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-8 sm:w-10 mb-4 transition-colors ${done ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function SubmitView() {
  const { submitReview } = useApp()

  const [step,       setStep]       = useState(1)
  const [firstName,  setFirstName]  = useState('')
  const [lastName,   setLastName]   = useState('')
  const [title,      setTitle]      = useState('')
  const [location,   setLocation]   = useState('')
  const [date,       setDate]       = useState(today())
  const [review,     setReview]     = useState('')
  const [images,     setImages]     = useState<string[]>([])
  const [extras,     setExtras]     = useState<PostExtras>(EMPTY_EXTRAS)
  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)

  const stepInfo = STEPS[step - 1]

  function next() {
    if (step === 1 && (!firstName.trim() || !lastName.trim())) {
      toast.error('Please enter both your first and last name')
      return
    }
    if (step === 2 && (!title.trim() || !location.trim())) {
      toast.error('Please enter a trip title and destination')
      return
    }
    if (step === 3 && images.length < 4) {
      toast.error(`Please add at least 4 photos (${images.length} added so far)`)
      return
    }
    setStep(s => s + 1)
  }

  function back() { setStep(s => s - 1) }

  async function handleSubmit() {
    if (!review.trim()) {
      toast.error('Please write your review before submitting')
      return
    }

    const newDataUrls = images.filter(i => i.startsWith('data:'))
    setSubmitting(true)
    try {
      await submitReview(
        {
          id: crypto.randomUUID(),
          name: title.trim(),
          staff: `${firstName.trim()} ${lastName.trim()}`,
          location: { name: location.trim(), lat: null, lng: null },
          date,
          review: review.trim(),
          images: [],
          showOnMap: false,
          extras,
        },
        newDataUrls
      )
      confetti({
        particleCount: 130,
        spread: 75,
        origin: { y: 0.55 },
        colors: ['#05979a', '#07c5b0', '#064e5a', '#f59e0b', '#ffffff', '#34d399'],
      })
      setSubmitted(true)
    } catch (err: any) {
      console.error('Submit error:', err)
      toast.error(err?.message ?? 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="font-gilbert text-3xl mb-2">Thanks for sharing!</h2>
        <p className="text-muted-foreground mb-6">Your trip has been submitted for approval!</p>
        <Button
          variant="secondary"
          onClick={() => {
            setStep(1)
            setFirstName(''); setLastName('')
            setTitle(''); setLocation(''); setDate(today())
            setReview(''); setImages([]); setExtras(EMPTY_EXTRAS)
            setSubmitted(false)
          }}
        >
          Submit another
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[520px]">

        {/* Header card */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-5 mb-6 text-center">
          <div className="flex justify-center mb-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Plane className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h2 className="font-gilbert text-2xl mb-0.5">Share Your Trip</h2>
          <p className="text-xs text-muted-foreground">
            We'll guide you through each section — takes about 2 minutes
          </p>
        </div>

        <StepProgress current={step} />

        {/* Step heading */}
        <div className="mb-5">
          <h3 className="font-gilbert text-lg">{stepInfo.title}</h3>
          <p className="text-sm text-muted-foreground">{stepInfo.subtitle}</p>
        </div>

        {/* ── Step content ── */}

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Johnson"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && next()}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Your name will appear on the post once it's approved.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Trip Title <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g. Bali 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trip Date <span className="text-destructive">*</span></Label>
                <DatePicker value={date} onChange={setDate} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Destination <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Bali, Indonesia"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-1.5">
            <MultiImageUpload values={images} onChange={setImages} />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-1.5">
            <ReviewExtras value={extras} onChange={setExtras} />
            <p className="text-xs text-muted-foreground pt-1">
              All categories are optional — add only what's relevant to your trip.
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-1.5">
            <Label>Your Review <span className="text-destructive">*</span></Label>
            <BlogEditor
              review={review}
              images={images}
              onReviewChange={setReview}
            />
            <p className="text-xs text-muted-foreground">
              Your first photo is the header. Click "Insert photo" to place the others where you want them.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className={`flex mt-6 ${step > 1 ? 'justify-between' : 'justify-end'}`}>
          {step > 1 && (
            <Button variant="ghost" onClick={back} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}

          {step < 5 && (
            <Button onClick={next} className="gap-1.5">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {step === 5 && (
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
                : <><Send className="h-4 w-4" /> Submit Trip</>
              }
            </Button>
          )}
        </div>

      </div>
    </div>
  )
}
