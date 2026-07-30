import { useState } from 'react'
import { X, CaretLeft, CaretRight, Compass, Camera, Globe, Airplane, CalendarDots, PaperPlaneTilt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

const STEPS: { Icon: React.ElementType; title: string; body: string }[] = [
  { Icon: Compass,        title: 'Welcome to DAFAGRAM',   body: "Your team's hub for sharing travel experiences, discovering destinations and registering for upcoming trips. Here's a quick tour." },
  { Icon: Camera,         title: 'Browse the Feed',        body: 'See trip photos, reviews and sales tips shared by colleagues from across the business.' },
  { Icon: Globe,          title: 'Explore the World Map',  body: 'Tap any country to see the destinations colleagues have visited, along with their write-ups and past trips.' },
  { Icon: Airplane,       title: 'Upcoming Trips',         body: "See what group trips are coming up and register your interest. Use “Update passport info” to keep your details current." },
  { Icon: CalendarDots,   title: 'Trips By Year',          body: 'Browse the full archive of past FAM and external trips, neatly organised by year.' },
  { Icon: PaperPlaneTilt, title: 'Share Your Trip',        body: 'Been somewhere great? Submit your own photos and review so the whole team can benefit.' },
]

export function Walkthrough({ onDismiss }: { onDismiss: (dontShowAgain: boolean) => void }) {
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(true)
  const isLast = step === STEPS.length - 1
  const { Icon, title, body } = STEPS[step]

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">

        {/* Icon header */}
        <div className="relative bg-gradient-to-br from-primary/15 to-primary/5 px-6 pt-8 pb-6 flex flex-col items-center text-center">
          <button
            onClick={() => onDismiss(dontShow)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-gilbert text-xl text-foreground">{title}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground leading-relaxed text-center min-h-[64px]">{body}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
                aria-label={`Go to step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
            />
            Don't show again
          </label>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setStep(s => s - 1)} className="gap-1">
                <CaretLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={() => onDismiss(dontShow)}>Get started</Button>
            ) : (
              <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                Next <CaretRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
