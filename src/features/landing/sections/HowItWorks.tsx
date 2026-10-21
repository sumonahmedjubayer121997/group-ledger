import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { formatMoney } from "../money";
import { Eyebrow, Reveal, SectionHeading, container } from "../ui";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);

const members = ["Laili", "Happy", "Sumon", "Popy"];
const expenses = [
  { what: "Hotel, 2 nights", paidBy: "Laili", amount: 6000 },
  { what: "Bus tickets", paidBy: "Happy", amount: 2400 },
  { what: "Dinner", paidBy: "Sumon", amount: 1800 },
];
const total = expenses.reduce((sum, e) => sum + e.amount, 0);
const share = total / members.length;
// Everyone's net position, then who pays Laili back (the only person owed money in this trip).
const debts = members
  .map((name) => ({
    name,
    net: expenses.filter((e) => e.paidBy === name).reduce((s, e) => s + e.amount, 0) - share,
  }))
  .filter((m) => m.net < 0)
  .sort((a, b) => a.net - b.net)
  .map((m) => ({ from: m.name, to: "Laili", amount: -m.net }));

const steps = [
  {
    title: "Create a group",
    body: "Name it, pick a currency and add people by name, link or QR code. Whoever hasn't joined yet keeps their share until they do.",
  },
  {
    title: "Add expenses",
    body: "Log who paid and split it equally, by percentage or by exact amounts. Everyone sees the same list.",
  },
  {
    title: "Settle up",
    body: "SplitWize shows who owes whom at a glance. Tap Mark as paid when someone pays you back, and the balance clears.",
  },
];

function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 place-items-center rounded-full border border-lp-rule bg-lp-paper text-[13px] font-medium text-lp-ink">
      {name[0]}
    </span>
  );
}

function Preview({ step }: { step: number }) {
  return (
    <div className="rounded-2xl border border-lp-rule bg-lp-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between border-b border-lp-rule pb-4">
        <p className="font-display text-2xl text-lp-ink">Sylhet trip</p>
        <p className="text-[13px] text-lp-muted">{members.length} members · ৳ BDT</p>
      </div>

      {step === 0 && (
        <ul className="divide-y divide-lp-rule">
          {members.map((name, i) => (
            <li key={name} className="flex items-center gap-3 py-3">
              <Avatar name={name} />
              <span className="text-sm text-lp-ink">{name}</span>
              <span className="ml-auto text-[13px] text-lp-muted">{i === 0 ? "Admin" : i === 3 ? "Not joined yet" : "Member"}</span>
            </li>
          ))}
        </ul>
      )}

      {step === 1 && (
        <>
          <ul className="divide-y divide-lp-rule">
            {expenses.map((e) => (
              <li key={e.what} className="flex items-center gap-3 py-3">
                <Avatar name={e.paidBy} />
                <div>
                  <p className="text-sm text-lp-ink">{e.what}</p>
                  <p className="text-[13px] text-lp-muted">Paid by {e.paidBy} · split 4 ways</p>
                </div>
                <span className="ml-auto text-sm font-medium tabular-nums text-lp-ink">{taka(e.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex justify-between border-t border-lp-rule pt-4 text-sm">
            <span className="text-lp-muted">Total · {taka(share)} each</span>
            <span className="font-medium tabular-nums text-lp-ink">{taka(total)}</span>
          </div>
        </>
      )}

      {step === 2 && (
        <ul className="divide-y divide-lp-rule">
          {debts.map((d) => (
            <li key={d.from} className="flex items-center gap-3 py-3">
              <Avatar name={d.from} />
              <ArrowRight className="h-4 w-4 text-lp-muted" aria-hidden="true" />
              <Avatar name={d.to} />
              <span className="text-sm text-lp-ink">
                {d.from} owes {d.to}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-lp-owes">{taka(d.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Step({
  index,
  active,
  onActive,
  title,
  body,
}: {
  index: number;
  active: boolean;
  onActive: () => void;
  title: string;
  body: string;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive();
  }, [inView, onActive]);

  return (
    <li ref={ref} className="border-t border-lp-rule py-8 md:flex md:min-h-[50vh] md:items-center md:py-0">
      <div>
        <p
          className={`font-display text-[32px] leading-none tabular-nums transition-colors duration-200 ${
            active ? "text-lp-ink" : "text-lp-muted md:opacity-60"
          }`}
        >
          0{index + 1}
        </p>
        <h3 className="mt-4 text-xl font-semibold text-lp-ink">{title}</h3>
        <p className="mt-2 max-w-sm text-base leading-6 text-lp-muted">{body}</p>
        <div className="mt-6 md:hidden">
          <Preview step={index} />
        </div>
      </div>
    </li>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const activators = useRef(steps.map((_, i) => () => setActive(i))).current;

  return (
    <section id="how-it-works" className="scroll-mt-16 py-[72px] md:py-32">
      <div className={container}>
        <Reveal>
          <Eyebrow>How it works</Eyebrow>
          <SectionHeading className="mt-3 max-w-xl">Three steps from receipt to settled.</SectionHeading>
        </Reveal>

        <div className="mt-10 grid md:mt-16 md:grid-cols-12 md:gap-6">
          <ol className="md:col-span-5">
            {steps.map((step, i) => (
              <Step key={step.title} index={i} active={active === i} onActive={activators[i]} {...step} />
            ))}
          </ol>

          <div className="hidden md:col-span-6 md:col-start-7 md:block">
            <div className="sticky top-[calc(50vh-170px)]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <Preview step={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
