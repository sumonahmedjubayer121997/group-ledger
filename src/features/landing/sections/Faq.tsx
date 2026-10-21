import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eyebrow, Reveal, SectionHeading, container } from "../ui";

const questions = [
  {
    q: "Is SplitWize free?",
    a: "Yes. Creating groups, adding expenses and settling up costs nothing.",
  },
  {
    q: "Do my friends need an account?",
    a: "Only to see the group. You can add them by name and track their share straight away. When they join with the group's link or QR code (a free account takes a minute), they pick their name and everything's waiting for them.",
  },
  {
    q: "How can I split an expense?",
    a: "Equally, by percentage, or by exact amounts per person. Pick whoever paid, and SplitWize works out everyone's share.",
  },
  {
    q: "Which currencies are supported?",
    a: "Each group has its own currency: Bangladeshi taka, US dollar, euro, British pound, Canadian dollar, Australian dollar or Japanese yen.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Install it from your browser and it opens like an app, works offline, and syncs when you're back online.",
  },
  {
    q: "Can I get my numbers out?",
    a: "Yes. Export any group, or a selection of expenses, as a PDF report or a CSV file. You can also download all your data from your profile.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-t border-lp-rule py-[72px] md:py-32">
      <div className={`${container} grid gap-10 md:grid-cols-12 md:gap-6`}>
        <Reveal className="md:col-span-4">
          <Eyebrow>FAQ</Eyebrow>
          <SectionHeading className="mt-3">Questions, answered.</SectionHeading>
        </Reveal>
        <Reveal className="md:col-span-7 md:col-start-6" delay={0.06}>
          <Accordion type="single" collapsible className="border-t border-lp-rule">
            {questions.map((item) => (
              <AccordionItem key={item.q} value={item.q} className="border-lp-rule">
                <AccordionTrigger className="py-5 text-left text-base font-medium text-lp-ink hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled [&>svg]:text-lp-muted motion-reduce:[&>svg]:transition-none">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-xl pb-5 text-[15px] leading-6 text-lp-muted">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
