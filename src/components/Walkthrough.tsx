import { useState, useEffect } from 'react'
import { X, CaretLeft, CaretRight, Compass, Camera, Globe, Airplane, CalendarDots, PaperPlaneTilt } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { View } from '@/lib/types'

const STEPS: { view: View; Icon: React.ElementType; title: string; body: string }[] = [
  { view: 'home',     Icon: Compass,        title: 'Welcome to DAFAGRAM',  body: "Your team's hub for travel experiences. This is your home dashboard — jump to any area from here or the sidebar." },
  { view: 'feed',     Icon: Camera,         title: 'The Feed',             body: 'Trip photos, reviews and sales tips shared by colleagues across the business. Tap any post to read the full write-up.' },
  { view: 'map',      Icon: Globe,          title: 'The World Map',        body: 'Tap any country to see the destinations colleagues have visited, plus their reviews and past trips.' },
  { view: 'upcoming', Icon: Airplane,       title: 'Upcoming Trips',       body: 'See what group trips are coming up and register your interest. Use “Update passport info” to keep your details current.' },
  { view: 'years',    Icon: CalendarDots,   title: 'Trips By Year',        body: 'The full archive of past FAM and external trips, neatly organised by year.' },
  { view: 'submit',   Icon: PaperPlaneTilt, title: 'Share My Trip',        body: 'Been somewhere great? Submit your own photos and review so the whole team can benefit.' },
]

export function Walkthrough({
  onNavigate,
  onDismiss,
}: {
  onNavigate: (view: View) => void
  onDismiss: (dontShowAgain: boolean) => void
}) {
  const [step, setStep] = useState(0)
  const [dontShow, setDontShow] = useState(true)
  const isLast = step === STEPS.length - 1
  const { Icon, title, body } = STEPS[step]

  // Take the user to the screen this step is about.
  useEffect(() => { onNavigate(STEPS[step].view) }, [step, onNavigate])

  function finish(dontShowAgain: boolean) {
    onNavigate('home')
    onDismiss(dontShowAgain)
  }

  return (
    // Wrapper lets clicks pass through to the app behind; only the card is interactive.
    <div className="fixed inset-x-0 bottom-20 lg:bottom-6 z-[100] flex justify-center px-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">Step {step + 1} of {STEPS.length}</p>
            <h2 className="font-gilbert text-lg text-foreground leading-tight">{title}</h2>
          </div>
          <button
            onClick={() => finish(dontShow)}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 self-start"
            aria-label="Close tour"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <p className="px-5 pt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 px-5 mt-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 mt-2 flex items-center justify-between gap-3 border-t border-border/60">
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
              <Button size="sm" onClick={() => finish(dontShow)}>Finish</Button>
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
