import { RadialBar, RadialBarChart, PolarAngleAxis } from 'recharts'

// Percentage gauge built on the shadcn chart stack (Recharts). Lazy-loaded so
// its bundle only ships when the tall-screen stats are actually shown.
export default function StatRing({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  return (
    <div className="relative h-12 w-12">
      <RadialBarChart
        width={48} height={48} cx="50%" cy="50%"
        innerRadius={17} outerRadius={24} barSize={6}
        data={[{ value: p }]} startAngle={90} endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar
          dataKey="value" angleAxisId={0} cornerRadius={6}
          className="fill-primary"
          background={{ fill: 'rgba(148,163,184,0.2)' } as never}
        />
      </RadialBarChart>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">{p}%</span>
    </div>
  )
}
