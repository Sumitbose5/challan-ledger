import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InsightsCard({ insights }: { insights: string[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>What stands out</CardTitle>
        <CardDescription>Worked out from the rows in this view</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3 text-sm leading-relaxed">
          {insights.map((text) => (
            <li key={text} className="border-l-2 border-chart-1/40 pl-3">
              {text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
