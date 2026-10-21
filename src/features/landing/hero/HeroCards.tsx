import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { Check, HandCoins, RotateCcw, Waypoints } from "lucide-react";
import { TiltCard } from "@/components/fx/TiltCard";
import { cn } from "@/lib/utils";
import { formatMoney } from "../money";
import { debtsFor, labelAt, netOf, pairKey, payments, people, personOf, spending, type PersonId, type Stage } from "./heroData";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);
const nameOf = (id: PersonId) => personOf(id).name;
const glass = "border border-[color:var(--fx-rim)] bg-[var(--fx-glass)] shadow-[inset_0_1px_0_var(--fx-rim-hi)]";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--fx-surface)]";
const action = `inline-flex h-10 items-center gap-2 rounded-full border border-lp-ink px-4 text-sm font-medium text-lp-ink transition-colors duration-150 hover:bg-lp-ink hover:text-lp-paper ${focusRing}`;

/* ---------- card 1: who owes whom ---------- */

/** The four friends and what they owe, as a small web; the lines flow towards whoever is owed while you hover. */
function DebtWebArt({ stage }: { stage: Stage }) {
  const debts = debtsFor(stage);
  const total = debts.reduce((sum, d) => sum + d.amount, 0);
  const status =
    stage === "tangled" ? `${debts.length} debts · ${taka(total)} changing hands` : stage === "simplified" ? `${debts.length} payments settle everyone` : "Everyone's square";
  const max = Math.max(...debtsFor("simplified").map((d) => d.amount));
  return (
    <div className="flex h-full flex-col p-3">
      <p className={cn("inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[12px] tabular-nums", glass, stage === "settled" ? "text-lp-settled" : "text-lp-muted")}>
        {stage === "settled" && <Check className="h-3.5 w-3.5" />}
        {status}
      </p>
      <svg viewBox="0 0 320 206" className="mt-1 min-h-0 w-full flex-1">
        <AnimatePresence initial={false}>
          {debts.map((d) => {
            const a = personOf(d.from);
            const b = personOf(d.to);
            const t = labelAt[pairKey(d.from, d.to)] ?? 0.5;
            const lx = a.x + (b.x - a.x) * t;
            const ly = a.y + (b.y - a.y) * t;
            const text = taka(d.amount);
            const w = text.length * 6.2 + 12;
            return (
              <motion.g key={pairKey(d.from, d.to)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <motion.line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--lp-ink)"
                  strokeOpacity={0.55}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1, strokeWidth: 1.5 + (4 * d.amount) / max }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--lp-owes)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray="0.1 12"
                  className="opacity-0 transition-opacity group-hover/fx:animate-[fx-flow_0.9s_linear_infinite] group-hover/fx:opacity-100 motion-reduce:hidden"
                />
                <rect x={lx - w / 2} y={ly - 9} width={w} height={18} rx={9} fill="var(--fx-surface)" stroke="var(--fx-rim)" />
                <text x={lx} y={ly + 3.6} textAnchor="middle" fontSize="10.5" fill="var(--lp-ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {text}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>
        {people.map((p) => {
          const owed = netOf(p.id) > 0;
          const fill = stage === "settled" ? "var(--lp-settled)" : owed ? "var(--fx-surface)" : "var(--lp-owes)";
          return (
            <g key={p.id}>
              <circle cx={p.x} cy={p.y + 3} r={20} fill="var(--fx-shadow)" opacity={0.5} />
              <motion.circle cx={p.x} cy={p.y} r={19} animate={{ fill }} transition={{ duration: 0.4 }} stroke={owed ? "var(--lp-settled)" : "var(--fx-rim)"} strokeWidth={owed ? 2.5 : 1} />
              <text x={p.x} y={p.y + 4.5} textAnchor="middle" fontSize="13" fontWeight={600} fill={owed && stage !== "settled" ? "var(--lp-ink)" : "#fff"}>
                {p.name[0]}
              </text>
              <text x={p.x} y={p.nameAt === "above" ? p.y - 27 : p.y + 36} textAnchor="middle" fontSize="12" fontWeight={500} fill="var(--lp-ink)">
                {p.name}
              </text>
            </g>
          );
        })}
        <AnimatePresence>
          {stage === "settled" && (
            <motion.g key="square" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} style={{ originX: "160px", originY: "104px" }}>
              <circle cx={160} cy={104} r={24} fill="var(--lp-settled)" opacity={0.16} />
              <path d="M150 104l7 7 14-15" fill="none" stroke="var(--lp-settled)" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

/* ---------- card 2: spending, compared ---------- */

const CX = 150;
const CY = 168;
const R = 108;
const point = (deg: number) => `${(CX + R * Math.cos((deg * Math.PI) / 180)).toFixed(2)} ${(CY + R * Math.sin((deg * Math.PI) / 180)).toFixed(2)}`;
/** -40% sits at the far left, +40% at the far right. */
const angleFor = (pct: number) => -90 + Math.max(-40, Math.min(40, pct)) * 2.2;

/** The reference dial: this month against last, with the needle swinging to whoever you tap. */
function SpendDial({ pct }: { pct: number }) {
  const reduce = useReducedMotion();
  const less = pct < 0;
  const angle = angleFor(pct);
  const colour = less ? "var(--lp-settled)" : "var(--lp-owes)";
  const ticks = Array.from({ length: 25 }, (_, i) => -180 + i * 7.5);
  return (
    <div className="relative h-full">
      <div className={cn("absolute left-4 top-4 z-10 rounded-xl px-4 py-3", glass)}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={pct} initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <p className="font-display text-[38px] leading-none text-lp-ink">{Math.abs(pct)}%</p>
            <p className="mt-1 text-[12px] leading-4 text-lp-muted">
              {less ? "less" : "more"} than
              <br />
              last month
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
      <svg viewBox="0 0 300 196" className="absolute -right-4 top-1 h-[112%] w-auto" fill="none">
        <path d={`M${point(-180)} A${R} ${R} 0 0 1 ${point(0)}`} stroke="var(--fx-rim)" strokeWidth="13" strokeLinecap="round" />
        <motion.path
          animate={{ d: `M${point(-180)} A${R} ${R} 0 0 1 ${point(angle)}`, stroke: colour }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 14 }}
          strokeWidth="13"
          strokeLinecap="round"
          strokeOpacity={0.9}
        />
        {ticks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const inner = deg % 30 === 0 ? 116 : 121;
          return (
            <line
              key={deg}
              x1={CX + Math.cos(rad) * 126}
              y1={CY + Math.sin(rad) * 126}
              x2={CX + Math.cos(rad) * inner}
              y2={CY + Math.sin(rad) * inner}
              stroke="var(--lp-muted)"
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
          );
        })}
        <g transform={`translate(${CX} ${CY})`}>
          <motion.g animate={{ rotate: angle }} initial={reduce ? false : { rotate: -180 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 70, damping: 11 }}>
            {/* A clear circle centred on the pivot, so the needle turns around it. */}
            <circle r="100" fill="transparent" />
            <line x1="0" y1="0" x2="94" y2="0" stroke="var(--lp-ink)" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
          <circle r="15" fill="var(--fx-surface)" stroke="var(--fx-rim)" strokeWidth="2" />
          <circle r="5.5" fill="var(--lp-ink)" />
        </g>
      </svg>
    </div>
  );
}

/* ---------- card 3: settle up ---------- */

function SettleArt({ paidAmount, total }: { paidAmount: number; total: number }) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const done = paidAmount === total;
  return (
    <div className="flex h-full items-center gap-5 px-6">
      <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0 -rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--fx-rim)" strokeWidth="9" />
        <motion.circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke="var(--lp-settled)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          animate={{ strokeDashoffset: c * (1 - paidAmount / total) }}
          transition={{ type: "spring", stiffness: 80, damping: 16 }}
        />
      </svg>
      <div>
        <p className="font-display text-[30px] leading-none text-lp-ink tabular-nums">{done ? "All square" : taka(paidAmount)}</p>
        <p className="mt-1.5 text-[13px] text-lp-muted">{done ? "Every payment is in." : `of ${taka(total)} paid back`}</p>
      </div>
    </div>
  );
}

/* ---------- the deck ---------- */

const CARDS = [
  { key: "web", tab: "Who owes whom" },
  { key: "spend", tab: "Spending" },
  { key: "settle", tab: "Settle up" },
] as const;

// Where each card sits: 0 at the front, the others stacked behind and above it.
const slot = (depth: number) =>
  depth === 0 ? { y: 0, scale: 1, rotate: 0, opacity: 1 } : depth === 1 ? { y: -24, scale: 0.94, rotate: -2.5, opacity: 0.85 } : { y: -46, scale: 0.88, rotate: 2.5, opacity: 0.6 };

/** Keeps the cards behind out of the tab order and away from screen readers. */
function DeckSlot({ depth, onBringForward, onSwipe, id, labelledBy, children }: { depth: number; onBringForward: () => void; onSwipe: (dir: 1 | -1) => void; id: string; labelledBy: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const front = depth === 0;
  useEffect(() => {
    ref.current?.toggleAttribute("inert", !front);
  }, [front]);

  const dragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -70 || info.velocity.x < -500) onSwipe(1);
    else if (info.offset.x > 70 || info.velocity.x > 500) onSwipe(-1);
  };

  return (
    <motion.div
      ref={ref}
      id={id}
      role="tabpanel"
      aria-labelledby={labelledBy}
      aria-hidden={!front}
      className={cn("absolute inset-x-0 bottom-0 h-[408px] origin-top sm:h-[432px]", !front && "cursor-pointer")}
      style={{ zIndex: 30 - depth * 10 }}
      animate={slot(depth)}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
      drag={front ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.5}
      onDragEnd={dragEnd}
      onClick={front ? undefined : onBringForward}
    >
      {children}
    </motion.div>
  );
}

/**
 * The welcome page's centrepiece: three lit, tilting cards that show SplitWize working on a made-up
 * weekend. Simplify the debts, watch a month compare, and mark payments as paid; the cards share
 * one state, so settling up on the third card squares the web on the first. Swipe, tap the cards
 * behind, or use the tabs (arrow keys too).
 */
export function HeroCards() {
  const [front, setFront] = useState(0);
  const [simplified, setSimplified] = useState(false);
  const [paid, setPaid] = useState<Set<string>>(() => new Set());
  const [who, setWho] = useState<PersonId>("laili");
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = payments.reduce((sum, p) => sum + p.amount, 0);
  const paidAmount = payments.filter((p) => paid.has(p.from)).reduce((sum, p) => sum + p.amount, 0);
  const allPaid = paid.size === payments.length;
  const stage: Stage = allPaid ? "settled" : simplified ? "simplified" : "tangled";
  const debts = debtsFor(stage);

  const go = (i: number) => setFront((i + CARDS.length) % CARDS.length);
  const reset = () => {
    setSimplified(false);
    setPaid(new Set());
  };
  const togglePaid = (from: PersonId) => {
    setSimplified(true);
    setPaid((prev) => {
      const next = new Set(prev);
      if (next.has(from)) next.delete(from);
      else next.add(from);
      return next;
    });
  };
  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = (front + (e.key === "ArrowRight" ? 1 : -1) + CARDS.length) % CARDS.length;
    setFront(i);
    tabs.current[i]?.focus();
  };

  const webAction =
    stage === "tangled"
      ? { label: "Simplify", Icon: Waypoints, run: () => setSimplified(true) }
      : stage === "simplified"
        ? { label: "Settle up", Icon: HandCoins, run: () => go(2) }
        : { label: "Start again", Icon: RotateCcw, run: reset };

  const cards: Record<(typeof CARDS)[number]["key"], ReactNode> = {
    web: (
      <TiltCard tone={stage === "settled" ? "settled" : "plain"} light="top-left" max={5} art={<DebtWebArt stage={stage} />} artClassName="h-52 sm:h-60" title="Laili's weekend in Sylhet">
        <p className="mt-1 text-[14px] leading-6 text-lp-muted">
          {stage === "tangled"
            ? "Six debts between four friends. SplitWize finds the fewest payments that settle them."
            : stage === "simplified"
              ? "Three payments, all to Laili, square everyone. Nobody pays twice."
              : "Everyone's square. Start again to replay it."}
        </p>
        <p className="sr-only" aria-live="polite">
          {debts.length === 0 ? "Nobody owes anybody." : debts.map((d) => `${nameOf(d.from)} owes ${nameOf(d.to)} ${taka(d.amount)}.`).join(" ")}
        </p>
        <button type="button" className={cn(action, "mt-4")} onClick={webAction.run}>
          <webAction.Icon className="h-4 w-4" aria-hidden="true" />
          {webAction.label}
        </button>
      </TiltCard>
    ),
    spend: (
      <TiltCard tone={spending[who] < 0 ? "settled" : "owes"} light="top-right" max={5} art={<SpendDial pct={spending[who]} />} artClassName="h-48 sm:h-56" title="This month, compared">
        <p className="mt-1 text-[14px] leading-6 text-lp-muted" aria-live="polite">
          {nameOf(who)} spent {Math.abs(spending[who])}% {spending[who] < 0 ? "less" : "more"} than last month.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Whose month">
          {(["laili", "happy", "popy", "sumon"] as PersonId[]).map(personOf).map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={who === p.id}
              onClick={() => setWho(p.id)}
              className={cn(
                "h-9 rounded-full border px-3.5 text-[13px] transition-colors duration-150",
                focusRing,
                who === p.id ? "border-lp-ink bg-lp-ink text-lp-paper" : "border-lp-rule text-lp-muted hover:border-lp-muted hover:text-lp-ink"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
      </TiltCard>
    ),
    settle: (
      <TiltCard tone="settled" light="top" max={5} art={<SettleArt paidAmount={paidAmount} total={total} />} artClassName="h-32 sm:h-36" title="Settle up">
        <ul className="mt-3 space-y-2">
          {payments.map((p) => {
            const done = paid.has(p.from);
            return (
              <li key={p.from} className="flex items-center gap-3 text-[14px]">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors", done ? "border-lp-settled bg-lp-settled text-white" : "border-lp-rule")}>
                  <AnimatePresence>
                    {done && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </span>
                <span className={cn("min-w-0 flex-1 truncate", done ? "text-lp-muted line-through decoration-lp-muted/50" : "text-lp-ink")}>
                  {nameOf(p.from)} pays {nameOf(p.to)} <span className="tabular-nums">{taka(p.amount)}</span>
                </span>
                <button
                  type="button"
                  onClick={() => togglePaid(p.from)}
                  className={cn(
                    "h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
                    focusRing,
                    done ? "text-lp-muted hover:text-lp-ink" : "border border-lp-ink text-lp-ink hover:bg-lp-ink hover:text-lp-paper"
                  )}
                  aria-label={done ? `Undo: ${nameOf(p.from)} hasn't paid` : `Mark as paid: ${nameOf(p.from)} paid ${nameOf(p.to)} ${taka(p.amount)}`}
                >
                  {done ? "Undo" : "Mark as paid"}
                </button>
              </li>
            );
          })}
        </ul>
      </TiltCard>
    ),
  };

  return (
    <div>
      <div className="relative h-[456px] [perspective:1400px] sm:h-[480px]">
        {CARDS.map((card, i) => {
          const depth = (i - front + CARDS.length) % CARDS.length;
          return (
            <DeckSlot key={card.key} id={`hero-card-${card.key}`} labelledBy={`hero-tab-${card.key}`} depth={depth} onBringForward={() => setFront(i)} onSwipe={(dir) => go(front + dir)}>
              {cards[card.key]}
            </DeckSlot>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Try SplitWize" className="flex gap-1.5 rounded-full border border-lp-rule p-1" onKeyDown={onTabKey}>
          {CARDS.map((card, i) => (
            <button
              key={card.key}
              ref={(el) => (tabs.current[i] = el)}
              id={`hero-tab-${card.key}`}
              type="button"
              role="tab"
              aria-selected={front === i}
              aria-controls={`hero-card-${card.key}`}
              tabIndex={front === i ? 0 : -1}
              onClick={() => setFront(i)}
              className={cn(
                "h-9 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition-colors duration-150",
                focusRing,
                front === i ? "bg-lp-ink text-lp-paper" : "text-lp-muted hover:text-lp-ink"
              )}
            >
              {card.tab}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-lp-muted">Swipe, or tap a card behind.</p>
      </div>
    </div>
  );
}
