import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const modules = [
  {
    title: "Deck Analyser",
    body: "Upload a PDF or PPTX deck and receive structured investor-readiness feedback.",
  },
  {
    title: "Financial Model",
    body: "Turn founder assumptions into a 36-month projection and funding narrative.",
  },
  {
    title: "Investor Matching",
    body: "Use Apify and OpenAI to score relevant investors and outreach angles.",
  },
]

export function ModuleCards() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16">
      <h2 className="font-heading mb-10 max-w-2xl text-3xl font-medium tracking-tight md:text-4xl">
        Everything you need to run a sharp raise
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.title}>
            <CardHeader>
              <CardTitle>{module.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {module.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
