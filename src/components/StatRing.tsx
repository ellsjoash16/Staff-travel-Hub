import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'

// Percentage wheel via react-circular-progressbar. Lazy-loaded so it only ships
// when the tall-screen stats are shown.
export default function StatRing({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="h-14 w-14">
      <CircularProgressbar
        value={p}
        text={`${p}%`}
        strokeWidth={11}
        styles={buildStyles({
          strokeLinecap: 'round',
          pathColor: 'hsl(var(--primary))',
          trailColor: 'hsl(var(--muted))',
          textColor: 'hsl(var(--foreground))',
          textSize: '26px',
          pathTransitionDuration: 0.6,
        })}
      />
    </div>
  )
}
