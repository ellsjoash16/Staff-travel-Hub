import { Label, PolarAngleAxis, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

// shadcn radial chart (Recharts) as a percentage gauge. Lazy-loaded so recharts
// only ships when the tall-screen stats are shown.
const chartConfig = {
  value: { label: 'World' },
  world: { label: 'World', color: 'hsl(var(--primary))' },
} satisfies ChartConfig

export default function StatRing({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const data = [{ name: 'world', value: p, fill: 'var(--color-world)' }]
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[5.5rem]">
      <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius={34} outerRadius={52}>
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar dataKey="value" angleAxisId={0} cornerRadius={30} background={{ fill: 'rgba(148,163,184,0.2)' } as never} />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-lg font-bold">{p}%</tspan>
                  </text>
                )
              }
              return null
            }}
          />
        </PolarRadiusAxis>
      </RadialBarChart>
    </ChartContainer>
  )
}
