import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Loader2, CheckCircle, Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { MultiImageUpload } from './MultiImageUpload'
import { DatePicker } from './DatePicker'
import { useApp } from '@/context/AppContext'
import { today } from '@/lib/utils'

export function SubmitView() {
  const { submitReview } = useApp()
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(today())
  const [review, setReview] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !review.trim()) {
      toast.error('Please enter your name and a review')
      return
    }

    const newDataUrls = images.filter((i) => i.startsWith('data:'))

    setSubmitting(true)
    try {
      await submitReview(
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          location: { name: location.trim(), lat: null, lng: null },
          date,
          review: review.trim(),
          images: [],
        },
        newDataUrls
      )
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      toast.error('Something went wrong. Please try again.')
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
        <h2 className="font-outfit font-bold text-3xl mb-2">Thanks for sharing!</h2>
        <p className="text-muted-foreground mb-6">
          Your review has been submitted and will be posted by an admin shortly.
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setName(''); setLocation(''); setDate(today())
            setReview(''); setImages([]); setSubmitted(false)
          }}
        >
          Submit another
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[500px]">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-6 mb-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Plane className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h2 className="font-outfit font-bold text-3xl mb-1">Share Your Trip</h2>
          <p className="text-sm text-muted-foreground">
            Submit your travel photos and review — an admin will post it on your behalf.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Your Photos <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <MultiImageUpload values={images} onChange={setImages} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Your Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Sarah Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trip Date</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Destination</Label>
            <Input
              placeholder="e.g. Bali, Indonesia"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Your Review <span className="text-destructive">*</span></Label>
            <Textarea
              placeholder="Tell us about your trip — highlights, recommendations, what you loved..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              className="min-h-[120px]"
            />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full gap-2">
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              : <><Send className="h-4 w-4" /> Submit Review</>
            }
          </Button>
        </div>
      </div>
    </div>
  )
}
