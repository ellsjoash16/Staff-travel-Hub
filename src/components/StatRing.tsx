import { Label, PolarGrid, PolarRadiusAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'

// shadcn "Radial Chart - Shape" (chart-radial-shape) adapted to the world %.
// Lazy-loaded so recharts only ships when the tall-screen stats render.
const chartConfig = {
  value: { label: 'World' },
  world: { label: 'World', color: 'var(--chart-2)' },
} satisfies ChartConfig

export default function StatRing({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, Math.round(pct)))
  const chartData = [{ browser: 'world', value: p, fill: 'var(--color-world)' }]
  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square w-full max-w-[7rem]">
      <RadialBarChart data={chartData} endAngle={100} innerRadius={30} outerRadius={45}>
        <PolarGrid
          gridType="circle"
          radialLines={false}
          stroke="none"
          className="first:fill-muted last:fill-background"
          polarRadius={[40, 34]}
        />
        <RadialBar dataKey="value" background />
        <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
          <Label
            content={({ viewBox }) => {
              if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                return (
                  <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                    <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">{p}%</tspan>
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
