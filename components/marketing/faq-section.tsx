import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  ["What file types are supported?", "PDF and PPTX pitch decks up to 20MB."],
  [
    "How does investor matching work?",
    "The app uses your profile, deck analysis, Apify lead data, and OpenAI scoring to rank relevant investors.",
  ],
  ["Is my deck private?", "Decks are stored in private Supabase Storage buckets with owner-based access."],
  ["Where does investor data come from?", "Investor leads come from configured Apify actors and are normalised before scoring."],
  ["Do I need a paid plan?", "Free users see limited results. Paid plans unlock full reports, exports, and investor matching."],
]

export function FaqSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <h2 className="font-heading mb-6 text-3xl font-medium tracking-tight md:text-4xl">
        FAQ
      </h2>
      <Accordion type="single" collapsible>
        {faqs.map(([question, answer]) => (
          <AccordionItem key={question} value={question}>
            <AccordionTrigger>{question}</AccordionTrigger>
            <AccordionContent>{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  )
}
