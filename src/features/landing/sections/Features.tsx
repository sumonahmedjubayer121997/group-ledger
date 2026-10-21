import type { ReactNode } from "react";
import { TiltCard, type CardTone, type LightFrom } from "@/components/fx/TiltCard";
import { Eyebrow, Reveal, SectionHeading, container } from "../ui";
import { CommandArt, DialArt, InboxArt, LoanArt, PaidArt, QrArt } from "./featureArt";

type Feature = { title: string; body: string; tone: CardTone; light: LightFrom; art: ReactNode };

// Each card shows a piece of the app itself. Green light for money that's settled or saved,
// amber for what's owed or due, white for everything else.
const features: Feature[] = [
  {
    title: "See where it went",
    body: "Insights compare each month with the last and your usual one. Budgets warn you before you overspend.",
    tone: "settled",
    light: "top-right",
    art: <DialArt />,
  },
  {
    title: "Mark as paid, in one tap",
    body: "The amount and your usual method are filled in, and both of you get a note when it's recorded.",
    tone: "settled",
    light: "top-left",
    art: <PaidArt />,
  },
  {
    title: "Notifications that say what changed",
    body: "“Laili changed Dinner from ৳500 to ৳600”, not “expense updated”. Several at once fold into one, and any group can be muted.",
    tone: "plain",
    light: "top-left",
    art: <InboxArt />,
  },
  {
    title: "Everything from one bar",
    body: "Press Ctrl+K to add an expense, mark a debt as paid or jump to a group, without leaving the keyboard.",
    tone: "owes",
    light: "top",
    art: <CommandArt />,
  },
  {
    title: "Join with a QR code",
    body: "Friends scan the group's code, pick their name, and everything they owe or are owed is waiting.",
    tone: "plain",
    light: "top-right",
    art: <QrArt />,
  },
  {
    title: "Loans, outside any group",
    body: "Lent a friend money? Track part payments and due dates, privately.",
    tone: "owes",
    light: "top-left",
    art: <LoanArt />,
  },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-lp-rule py-[72px] md:py-32">
      <div className={container}>
        <Reveal>
          <Eyebrow>Features</Eyebrow>
          <SectionHeading className="mt-3 max-w-xl">Everything a shared wallet needs. Nothing it doesn't.</SectionHeading>
        </Reveal>

        {/* One raised frame around the set, so the cards read as one object. */}
        <div className="mt-10 rounded-[28px] border border-lp-rule bg-[var(--fx-frame)] p-2 shadow-[inset_0_1px_0_var(--fx-rim-hi)] md:mt-16 md:p-3">
          <div className="grid gap-2 md:grid-cols-2 md:gap-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 2) * 0.06} className="h-full min-w-0">
                <TiltCard tone={f.tone} light={f.light} art={f.art} artClassName="h-48 md:h-52" title={f.title}>
                  <p className="mt-1.5 text-[15px] leading-6 text-lp-muted">{f.body}</p>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
