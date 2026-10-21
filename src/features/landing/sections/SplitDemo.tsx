import { useEffect, useRef, useState } from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { CURRENCIES, type CurrencyCode, defaultCurrency, formatMoney, splitByWeights } from "../money";
import { EASE_OUT, Eyebrow, Reveal, SectionHeading, container } from "../ui";

type Mode = "equal" | "percent" | "exact";

const people = ["You", "Happy", "Popy"];
const modes: { id: Mode; label: string }[] = [
  { id: "equal", label: "Equal" },
  { id: "percent", label: "Percent" },
  { id: "exact", label: "Exact" },
];

const field =
  "h-11 rounded-[10px] border border-lp-rule bg-lp-paper px-3 text-[15px] text-lp-ink tabular-nums transition-colors duration-150 hover:border-lp-muted focus:border-lp-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled";

const possessive = (person: string) => (person === "You" ? "Your" : `${person}'s`);

const toCents = (value: string) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
};

function AnimatedMoney({ cents, currency, className = "" }: { cents: number; currency: CurrencyCode; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(cents);
  const current = useRef(cents);

  useEffect(() => {
    if (reduce) {
      current.current = cents;
      setShown(cents);
      return;
    }
    const controls = animate(current.current, cents, {
      duration: 0.25,
      ease: EASE_OUT,
      onUpdate: (v) => {
        current.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [cents, reduce]);

  return <span className={`tabular-nums ${className}`}>{formatMoney(Math.round(shown), currency)}</span>;
}

export function SplitDemo() {
  const reduce = useReducedMotion();
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [amount, setAmount] = useState(() => (defaultCurrency() === "BDT" ? "3600" : "120"));
  const [mode, setMode] = useState<Mode>("equal");
  const [percents, setPercents] = useState(["40", "30", "30"]);
  const [exacts, setExacts] = useState(["", "", ""]);

  const total = toCents(amount);
  const percentNumbers = percents.map((p) => Math.max(0, Number.parseFloat(p) || 0));
  const percentSum = percentNumbers.reduce((s, p) => s + p, 0);
  const exactCents = exacts.map(toCents);
  const exactSum = exactCents.reduce((s, c) => s + c, 0);

  let shares: number[];
  let problem: string | null = null;
  if (mode === "equal") {
    shares = splitByWeights(total, people.map(() => 1));
  } else if (mode === "percent") {
    const exact = Math.abs(percentSum - 100) < 0.001;
    shares = exact
      ? splitByWeights(total, percentNumbers.map((p) => Math.round(p * 1000)))
      : percentNumbers.map((p) => Math.round((total * p) / 100));
    if (!exact) problem = `Percentages add up to ${Number(percentSum.toFixed(2))}%. They need to make 100%.`;
  } else {
    shares = exactCents;
    const diff = total - exactSum;
    if (diff > 0) problem = `${formatMoney(diff, currency)} still to assign.`;
    if (diff < 0) problem = `${formatMoney(-diff, currency)} more than the bill.`;
  }
  if (total === 0) problem = "Enter the bill amount to see the split.";

  const chooseMode = (next: Mode) => {
    if (next === "exact") {
      // Start exact amounts from an equal split so the visitor only adjusts.
      setExacts(splitByWeights(total, people.map(() => 1)).map((c) => (c / 100).toFixed(2)));
    }
    setMode(next);
  };

  const onAmount = (value: string) => {
    if (/^\d{0,7}(\.\d{0,2})?$/.test(value)) setAmount(value);
  };

  return (
    <section id="try" className="scroll-mt-16 border-t border-lp-rule py-[72px] md:py-32">
      <div className={`${container} grid gap-10 md:grid-cols-12 md:gap-6`}>
        <Reveal className="md:col-span-5">
          <Eyebrow>Try a split</Eyebrow>
          <SectionHeading className="mt-3">See who owes whom, as you type.</SectionHeading>
          <p className="mt-4 max-w-sm text-base leading-6 text-lp-muted">
            This is the same maths SplitWize runs on every expense. Change the amount or the method and watch the
            shares move. Every cent is accounted for.
          </p>
        </Reveal>

        <Reveal className="md:col-span-7" delay={0.06}>
          <div className="rounded-2xl border border-lp-rule bg-lp-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="text-[13px] text-lp-muted">Bill, paid by you</span>
                <input
                  className={`${field} w-full`}
                  inputMode="decimal"
                  autoComplete="off"
                  value={amount}
                  onChange={(e) => onAmount(e.target.value)}
                  aria-describedby="split-status"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[13px] text-lp-muted">Currency</span>
                <select
                  className={`${field} pr-8`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-1 rounded-[10px] border border-lp-rule p-1" role="group" aria-label="Split method">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={mode === m.id}
                  onClick={() => chooseMode(m.id)}
                  className={`h-9 rounded-[7px] text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled ${
                    mode === m.id ? "bg-lp-ink text-lp-paper" : "text-lp-muted hover:text-lp-ink"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <ul className="mt-5 space-y-4">
              {people.map((person, i) => {
                const width = total > 0 ? Math.min(100, (shares[i] / total) * 100) : 0;
                return (
                  <li key={person}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-lp-rule bg-lp-paper text-[13px] font-medium text-lp-ink">
                        {person[0]}
                      </span>
                      <span className="text-sm text-lp-ink">{person}</span>
                      {mode === "percent" && (
                        <label className="ml-auto flex items-center gap-1.5">
                          <span className="sr-only">{possessive(person)} percentage</span>
                          <input
                            className={`${field} h-9 w-20 text-right`}
                            inputMode="decimal"
                            value={percents[i]}
                            onChange={(e) =>
                              /^\d{0,3}(\.\d{0,2})?$/.test(e.target.value) &&
                              setPercents((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                            }
                          />
                          <span className="text-sm text-lp-muted">%</span>
                        </label>
                      )}
                      {mode === "exact" && (
                        <label className="ml-auto">
                          <span className="sr-only">{possessive(person)} amount</span>
                          <input
                            className={`${field} h-9 w-28 text-right`}
                            inputMode="decimal"
                            value={exacts[i]}
                            onChange={(e) =>
                              /^\d{0,7}(\.\d{0,2})?$/.test(e.target.value) &&
                              setExacts((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                            }
                          />
                        </label>
                      )}
                      <AnimatedMoney
                        cents={shares[i]}
                        currency={currency}
                        className={`${mode === "equal" ? "ml-auto" : "w-28 text-right"} text-sm font-medium text-lp-ink`}
                      />
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-lp-rule">
                      <motion.div
                        className={`h-full rounded-full ${i === 0 ? "bg-lp-ink" : "bg-lp-owes"}`}
                        initial={false}
                        animate={{ width: `${width}%` }}
                        transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>

            <div id="split-status" className="mt-6 border-t border-lp-rule pt-4" aria-live="polite">
              {problem ? (
                <p className="text-sm text-lp-owes">{problem}</p>
              ) : (
                <ul className="space-y-1.5">
                  {people.slice(1).map((person, j) => (
                    <li key={person} className="flex justify-between text-sm">
                      <span className="text-lp-ink">{person} owes you</span>
                      <AnimatedMoney cents={shares[j + 1]} currency={currency} className="font-medium text-lp-owes" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
