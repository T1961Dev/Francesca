import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  [
    "What file types are supported?",
    "PDF and PowerPoint (.pptx). Simply upload your pitch deck as it is, there's no need to reformat or convert anything.",
  ],
  [
    "How does investor matching work?",
    "RaiseWise analyses your pitch deck, funding stage, sector and fundraising goals to identify investors who are actively investing in companies like yours. Instead of giving you a generic database, we provide a ranked shortlist based on relevance and investment fit.",
  ],
  [
    "Is my pitch deck private?",
    "Yes. Your pitch deck is private by default and only accessible to you. Your data is never shared, sold or made available to investors, other founders or third parties without your explicit permission. We take security seriously, using encryption and industry-standard safeguards to protect your information at every stage.",
  ],
  [
    "Where does the investor data come from?",
    "We combine multiple trusted, verified live data sources to deliver investor recommendations that are active, relevant and aligned with your fundraising goals, not static lists that become outdated the moment you download them.",
  ],
  [
    "Do I need a paid plan?",
    "No. You can upload one pitch deck and receive your Fundraising Readiness Score completely free. Upgrade only when you want access to your full analysis, investor-ready financial model, investor matches and outreach tools.",
  ],
  [
    "How long does the analysis take?",
    "Most analyses are completed in just a few minutes, depending on the size and complexity of your pitch deck.",
  ],
  [
    "Is RaiseWise suitable for first-time founders?",
    "Absolutely. Whether you're raising your first pre-seed round or preparing for Series A, RaiseWise helps you understand what investors look for and prepare with greater confidence.",
  ],
  [
    "Will RaiseWise guarantee funding?",
    "No. No platform can guarantee investment. RaiseWise is designed to help you present your business more effectively, strengthen your fundraising materials and connect with investors who are a better fit for your company.",
  ],
]

export function FaqSection() {
  return (
    <section id="faqs" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-16">
      <h2 className="font-heading mb-6 text-3xl font-normal tracking-tight md:text-4xl">
        Questions founders ask before they raise.
      </h2>
      <Accordion type="single" collapsible>
        {faqs.map(([question, answer]) => (
          <AccordionItem key={question} value={question}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent className="leading-relaxed text-muted-foreground">
              {answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
