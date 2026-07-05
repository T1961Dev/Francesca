import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
  [
    "What file types are supported?",
    "PDF and PowerPoint (.pptx). Upload your deck as-is; no need to reformat or convert anything.",
  ],
  [
    "How does investor matching work?",
    "We analyse your deck, your stage, sector, and funding goals, then rank the investors most likely to be relevant to your raise, not just anyone who's ever written a cheque, but funds and angels actively investing in companies like yours right now.",
  ],
  [
    "Is my deck private?",
    "Yes. Your deck is private by default and only ever visible to you. We never share, sell, or expose your data to anyone, including other founders, investors, or third parties, without your explicit permission.",
  ],
  [
    "Where does investor data come from?",
    "We combine multiple verified live data sources and continuously refresh them, so the investors you see are active and relevant today, not a static list that goes stale the day you sign up.",
  ],
  [
    "Do I need a paid plan?",
    "No; you can get your free Fundraising Readiness Score with no payment required. Paid plans unlock your full report, financial model, investor matches, and outreach tools, and more.",
  ],
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
