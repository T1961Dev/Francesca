import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const modules = [
  {
    step: "1",
    title: "Pitch Deck Review",
    body: "Understand how investors will evaluate your pitch before your first meeting.",
  },
  {
    step: "2",
    title: "Financial Planning",
    body: "Build an investor-ready financial model that supports your story with credible numbers.",
  },
  {
    step: "3",
    title: "Investor Discovery",
    body: "Find investors who actively back companies like yours, ranked by relevance and fit.",
  },
]

export function ModuleCards() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-16">
      <h2 className="font-heading mb-10 max-w-3xl text-3xl font-normal tracking-tight md:text-4xl">
        Built around how founders actually raise capital.
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((module) => (
          <Card key={module.title} className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="space-y-3">
              <p className="text-xs font-medium tracking-[0.16em] text-[#C9A84C] uppercase">
                {module.step}
              </p>
              <CardTitle className="font-heading text-xl font-normal">
                {module.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-muted-foreground">
              {module.body}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
