import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, QrCode } from "lucide-react";
import { TiltCard, type CardTone, type LightFrom } from "@/components/fx/TiltCard";
import { cn } from "@/lib/utils";
import { formatMoney } from "../money";
import { Eyebrow, Reveal, SectionHeading, container } from "../ui";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);
const glass = "border border-[color:var(--fx-rim)] bg-[var(--fx-glass)] shadow-[inset_0_1px_0_var(--fx-rim-hi)]";

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

type AvatarLook = "plain" | "owed" | "owes" | "invited";

/** A person's initial, coloured like the hero: amber for who owes, a green ring for who's owed. */
function Avatar({ name, look = "plain", size = "sm" }: { name: string; look?: AvatarLook; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-medium",
        size === "lg" ? "h-12 w-12 text-[15px]" : "h-8 w-8 text-[13px]",
        look === "owes" && "bg-lp-owes text-white",
        look === "owed" && "border-2 border-lp-settled bg-[var(--fx-surface)] text-lp-ink",
        look === "plain" && "border border-[color:var(--fx-rim)] bg-[var(--fx-surface)] text-lp-ink shadow-[inset_0_1px_0_var(--fx-rim-hi)]",
        look === "invited" && "border border-dashed border-lp-muted bg-[var(--fx-surface)] text-lp-muted"
      )}
    >
      {name[0]}
    </span>
  );
}

/* ---------- the pictures at the top of each card (decorative; the list below carries the meaning) ---------- */

/** Create a group: the four of them, Popy still to join, and the way in. */
function MembersArt() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div className="flex gap-2.5">
        {members.map((name, i) => (
          <span key={name} className="transition-transform duration-300 group-hover/fx:-translate-y-1" style={{ transitionDelay: `${i * 50}ms` }}>
            <Avatar name={name} size="lg" look={i === 0 ? "owed" : i === members.length - 1 ? "invited" : "plain"} />
          </span>
        ))}
      </div>
      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] text-lp-muted", glass)}>
        <QrCode className="h-3.5 w-3.5" /> Join by link or QR code
      </span>
    </div>
  );
}

/** Add expenses: the bill, and the four equal shares it splits into. */
function SplitArt() {
  return (
    <div className="flex h-full flex-col justify-center px-5">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-[40px] leading-none tabular-nums text-lp-ink">{taka(total)}</span>
        <span className="text-[13px] text-lp-muted">{expenses.length} expenses</span>
      </p>
      <div className="mt-4 flex gap-1">
        {members.map((name, i) => (
          <span
            key={name}
            className={cn("flex min-w-0 flex-1 flex-col items-center rounded-lg py-1.5 transition-transform duration-300 group-hover/fx:-translate-y-1", glass)}
            style={{ transitionDelay: `${i * 50}ms` }}
          >
            <span className="text-[12px] font-medium text-lp-ink">{name[0]}</span>
            <span className="text-[11px] tabular-nums text-lp-muted">{taka(share)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Settle up: three payments, all flowing to Laili, the one person owed. */
function SettleArt() {
  const to = { x: 250, y: 56 };
  const biggest = debts[0].amount;
  return (
    <svg viewBox="0 0 320 112" className="h-full w-full">
      {debts.map((d, i) => {
        const y = 16 + i * 40;
        const lx = 104 + 0.32 * (to.x - 22 - 104);
        const ly = y + 0.32 * (to.y - y);
        return (
          <g key={d.from}>
            <line x1={104} y1={y} x2={to.x - 22} y2={to.y} stroke="var(--lp-ink)" strokeOpacity={0.55} strokeWidth={1.5 + (4 * d.amount) / biggest} strokeLinecap="round" />
            <line
              x1={104}
              y1={y}
              x2={to.x - 22}
              y2={to.y}
              stroke="var(--lp-settled)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeDasharray="0.1 12"
              className="opacity-0 transition-opacity group-hover/fx:animate-[fx-flow_0.9s_linear_infinite] group-hover/fx:opacity-100 motion-reduce:hidden"
            />
            <rect x={lx - 23} y={ly - 9} width={46} height={18} rx={9} fill="var(--fx-surface)" stroke="var(--fx-rim)" />
            <text x={lx} y={ly + 3.6} textAnchor="middle" fontSize="10.5" fill="var(--lp-ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
              {taka(d.amount)}
            </text>
            <circle cx={90} cy={y + 2} r={15} fill="var(--fx-shadow)" opacity={0.5} />
            <circle cx={90} cy={y} r={14} fill="var(--lp-owes)" />
            <text x={90} y={y + 4.5} textAnchor="middle" fontSize="12" fontWeight={600} fill="#fff">
              {d.from[0]}
            </text>
            <text x={68} y={y + 4} textAnchor="end" fontSize="12" fontWeight={500} fill="var(--lp-ink)">
              {d.from}
            </text>
          </g>
        );
      })}
      <circle cx={to.x} cy={to.y} r={30} fill="var(--lp-settled)" opacity={0.14} />
      <circle cx={to.x} cy={to.y + 3} r={21} fill="var(--fx-shadow)" opacity={0.5} />
      <circle cx={to.x} cy={to.y} r={20} fill="var(--fx-surface)" stroke="var(--lp-settled)" strokeWidth={2.5} />
      <text x={to.x} y={to.y + 5} textAnchor="middle" fontSize="14" fontWeight={600} fill="var(--lp-ink)">
        {debts[0].to[0]}
      </text>
    </svg>
  );
}

const looks: { tone: CardTone; light: LightFrom; art: JSX.Element }[] = [
  { tone: "settled", light: "top-left", art: <MembersArt /> },
  { tone: "owes", light: "top", art: <SplitArt /> },
  { tone: "settled", light: "top-right", art: <SettleArt /> },
];

/** The trip as SplitWize shows it at each step, on the same lit, tilting cards as the rest of the page. */
function Preview({ step }: { step: number }) {
  const { tone, light, art } = looks[step];
  return (
    <TiltCard tone={tone} light={light} max={4} art={art} artClassName="h-32 sm:h-36" bodyClassName="p-5 pt-4 sm:p-6 sm:pt-5 md:p-6 md:pt-5">
      <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--fx-rim)] pb-3">
        <p className="font-display text-2xl text-lp-ink">Sylhet trip</p>
        <p className="shrink-0 text-[13px] text-lp-muted">
          {members.length} members · ৳ BDT
        </p>
      </div>

      {step === 0 && (
        <ul className="divide-y divide-[color:var(--fx-rim)]">
          {members.map((name, i) => {
            const invited = i === members.length - 1;
            return (
              <li key={name} className="flex items-center gap-3 py-2.5">
                <Avatar name={name} look={invited ? "invited" : "plain"} />
                <span className="text-sm text-lp-ink">{name}</span>
                {invited ? (
                  <span className="ml-auto rounded-full border border-dashed border-lp-muted px-2 py-0.5 text-[12px] text-lp-muted">Not joined yet</span>
                ) : (
                  <span className="ml-auto text-[13px] text-lp-muted">{i === 0 ? "Admin" : "Member"}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {step === 1 && (
        <>
          <ul className="divide-y divide-[color:var(--fx-rim)]">
            {expenses.map((e) => (
              <li key={e.what} className="flex items-center gap-3 py-2.5">
                <Avatar name={e.paidBy} />
                <div className="min-w-0">
                  <p className="truncate text-sm text-lp-ink">{e.what}</p>
                  <p className="truncate text-[13px] text-lp-muted">
                    Paid by {e.paidBy}
                    {/* The total row says it's split 4 ways, so the narrowest phones can drop it here. */}
                    <span className="max-[359px]:hidden"> · split 4 ways</span>
                  </p>
                </div>
                <span className="ml-auto text-sm font-medium tabular-nums text-lp-ink">{taka(e.amount)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-[color:var(--fx-rim)] pt-3 text-sm">
            <span className="text-lp-muted">Total · {taka(share)} each</span>
            <span className="font-medium tabular-nums text-lp-ink">{taka(total)}</span>
          </div>
        </>
      )}

      {step === 2 && (
        <ul className="divide-y divide-[color:var(--fx-rim)]">
          {debts.map((d) => (
            <li key={d.from} className="flex items-center gap-2.5 py-2.5 sm:gap-3">
              <Avatar name={d.from} look="owes" />
              {/* The text names both people, so the narrowest phones keep just the payer. */}
              <span className="contents max-[359px]:hidden">
                <ArrowRight className="h-4 w-4 shrink-0 text-lp-muted" aria-hidden="true" />
                <Avatar name={d.to} look="owed" />
              </span>
              <span className="min-w-0 truncate text-sm text-lp-ink">
                {d.from} owes {d.to}
              </span>
              <span className="ml-auto text-sm font-medium tabular-nums text-lp-owes">{taka(d.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </TiltCard>
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
      <div className="min-w-0 flex-1">
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
          <ol className="min-w-0 md:col-span-5">
            {steps.map((step, i) => (
              <Step key={step.title} index={i} active={active === i} onActive={activators[i]} {...step} />
            ))}
          </ol>

          <div className="hidden md:col-span-6 md:col-start-7 md:block">
            <div className="sticky top-[max(5rem,calc(50vh-235px))]">
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
