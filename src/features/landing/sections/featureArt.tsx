import { motion, useReducedMotion } from "framer-motion";
import { Bell, Check, ChevronDown, CornerDownLeft, MoreHorizontal, Search, Settings } from "lucide-react";
import { formatMoney } from "../money";

/**
 * The pictures on the landing page's feature cards, each drawn from SplitWize's own screens
 * (Insights, Mark as paid, notifications, the command bar, QR join, loans). Decorative: the card's
 * title and text carry the meaning. Colours come from the --lp-* and --fx-* tokens, so they work
 * on paper and on near-black.
 */

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);
const glass = "border border-[color:var(--fx-rim)] bg-[var(--fx-glass)] shadow-[inset_0_1px_0_var(--fx-rim-hi)]";
const fadeDown = { maskImage: "linear-gradient(#000 55%, transparent)", WebkitMaskImage: "linear-gradient(#000 55%, transparent)" };

/** Insights: "21% less than last month", with a dial whose needle settles into place once. */
export function DialArt() {
  const reduce = useReducedMotion();
  const ticks = Array.from({ length: 25 }, (_, i) => -180 + i * 7.5);
  return (
    <div className="relative h-full">
      <div className={`absolute left-4 top-5 z-10 rounded-xl px-4 py-3 ${glass}`}>
        <p className="font-display text-[40px] leading-none text-lp-ink">21%</p>
        <p className="mt-1 text-[12px] leading-4 text-lp-muted">
          less than
          <br />
          last month
        </p>
      </div>
      <svg viewBox="0 0 300 200" className="absolute -right-6 top-2 h-[118%] w-auto" fill="none">
        <path d="M40 170a110 110 0 0 1 220 0" stroke="var(--fx-rim)" strokeWidth="14" strokeLinecap="round" />
        <path d="M40 170a110 110 0 0 1 166-94" stroke="url(#dial-fill)" strokeWidth="14" strokeLinecap="round" />
        <defs>
          <linearGradient id="dial-fill" x1="40" y1="170" x2="210" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--lp-settled)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--lp-settled)" />
          </linearGradient>
        </defs>
        {ticks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={150 + Math.cos(rad) * 128}
              y1={170 + Math.sin(rad) * 128}
              x2={150 + Math.cos(rad) * (deg % 30 === 0 ? 118 : 123)}
              y2={170 + Math.sin(rad) * (deg % 30 === 0 ? 118 : 123)}
              stroke="var(--lp-muted)"
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
          );
        })}
        <g transform="translate(150 170)">
          <motion.g
            initial={reduce ? false : { rotate: -170 }}
            whileInView={{ rotate: -58 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ type: "spring", stiffness: 60, damping: 12, delay: 0.2 }}
          >
            {/* A clear circle centred on the pivot, so the needle turns around it. */}
            <circle r="100" fill="transparent" />
            <line x1="0" y1="0" x2="96" y2="0" stroke="var(--lp-ink)" strokeWidth="3" strokeLinecap="round" />
          </motion.g>
          <circle r="16" fill="var(--fx-surface)" stroke="var(--fx-rim)" strokeWidth="2" />
          <circle r="6" fill="var(--lp-ink)" />
        </g>
      </svg>
    </div>
  );
}

/** Mark as paid: a lit check in front of the payments it recorded. */
export function PaidArt() {
  const rows = [
    { text: `Popy paid you ${taka(2550)}`, on: true },
    { text: `Happy paid Laili ${taka(150)}`, on: true },
    { text: `Sumon paid Happy ${taka(300)}`, on: false },
  ];
  return (
    <div className="relative flex h-full flex-col justify-center gap-3 px-4 sm:flex-row sm:items-center sm:gap-5 sm:px-5">
      <div className="relative shrink-0">
        <div className="absolute -inset-3 rounded-[24px] bg-lp-settled/25 blur-xl sm:-inset-4" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-[14px] border-2 sm:h-[84px] sm:w-[84px] sm:rounded-[22px] border-lp-settled/60 bg-[var(--fx-surface)] shadow-[inset_0_1px_0_var(--fx-rim-hi),0_10px_30px_-10px_var(--fx-shadow)]">
          <Check className="h-6 w-6 text-lp-ink sm:h-10 sm:w-10" strokeWidth={2.5} />
        </div>
      </div>
      <ul className="min-w-0 space-y-1.5 sm:flex-1 sm:space-y-2" style={fadeDown}>
        {rows.map((row, i) => (
          <li
            key={row.text}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] sm:py-2 transition-transform duration-300 group-hover/fx:translate-x-1 sm:px-3 sm:text-[13px] ${glass} ${
              i === 1 ? "sm:ml-4" : i === 2 ? "sm:ml-1" : ""
            } ${row.on ? "text-lp-ink" : "text-lp-muted"}`}
          >
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border ${row.on ? "border-lp-settled bg-lp-settled/15" : "border-lp-rule"}`}>
              {row.on && <Check className="h-3 w-3 text-lp-settled" strokeWidth={3} />}
            </span>
            <span className="truncate tabular-nums">{row.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Notifications that name the change, folded by group. */
export function InboxArt() {
  return (
    <div className="relative h-full px-5 pt-5" style={fadeDown}>
      <div className={`rounded-xl p-3 ${glass}`}>
        <div className="flex items-center justify-between text-[13px] text-lp-muted">
          <span className="flex items-center gap-1 font-medium text-lp-ink">
            Notifications <ChevronDown className="h-3.5 w-3.5" />
          </span>
          <span className="flex items-center gap-2">
            <MoreHorizontal className="h-4 w-4" />
            <Settings className="h-3.5 w-3.5" />
          </span>
        </div>
        <div className="mt-2 flex gap-3 border-b border-lp-rule pb-2 text-[12px] text-lp-muted">
          <span className="text-lp-ink">
            All <span className="ml-0.5 rounded bg-lp-rule px-1 tabular-nums">3</span>
          </span>
          <span>
            Payments <span className="ml-0.5 rounded bg-lp-owes/20 px-1 tabular-nums text-lp-ink">1</span>
          </span>
        </div>
        <ul className="mt-2 space-y-2.5 text-[13px]">
          <li className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-rule text-[11px] text-lp-ink">L</span>
            <span className="min-w-0">
              <span className="block truncate text-lp-ink">Laili edited “Dinner”</span>
              <span className="block truncate text-[12px] tabular-nums text-lp-muted">
                Amount {taka(500)} → {taka(600)}
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2.5 transition-opacity duration-300 group-hover/fx:opacity-100 opacity-80">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lp-rule">
              <Bell className="h-3 w-3 text-lp-muted" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-lp-ink">3 expenses added in Sylhet trip</span>
              <span className="block truncate text-[12px] text-lp-muted">Bus tickets · Dinner and 1 more</span>
            </span>
          </li>
          <li className="flex items-start gap-2.5 opacity-50">
            <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-lp-rule" />
            <span className="block truncate text-lp-muted">Happy paid you {taka(150)}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

const keyRows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

/** The command bar, over a keyboard lit from above. */
export function CommandArt() {
  return (
    <div className="relative h-full">
      <div className="absolute inset-x-6 bottom-0 top-24 space-y-1.5 opacity-40 [perspective:400px]" style={fadeDown}>
        <div className="space-y-1.5 [transform:rotateX(35deg)]">
          {keyRows.map((row, r) => (
            <div key={row} className="flex justify-center gap-1.5" style={{ paddingLeft: r * 10 }}>
              {row.split("").map((k) => (
                <span key={k} className="flex h-6 w-6 items-center justify-center rounded-[5px] border border-[color:var(--fx-rim)] text-[9px] text-lp-muted">
                  {k}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className={`relative mx-5 mt-5 rounded-xl p-2 ${glass}`}>
        <div className="flex items-center gap-2 border-b border-lp-rule px-2 pb-2 text-[13px] text-lp-muted">
          <Search className="h-3.5 w-3.5" />
          <span className="truncate">Search commands…</span>
          <span className="ml-auto rounded border border-lp-rule px-1 text-[10px]">Esc</span>
        </div>
        <p className="px-2 pt-2 text-[10px] font-medium uppercase tracking-wider text-lp-muted">Actions</p>
        <ul className="mt-1 text-[13px]">
          <li className="flex items-center justify-between rounded-md bg-lp-rule/70 px-2 py-1.5 text-lp-ink">
            Add expense <span className="rounded border border-lp-rule px-1 text-[10px] text-lp-muted">N</span>
          </li>
          <li className="flex items-center justify-between px-2 py-1.5 text-lp-muted">
            Mark as paid <CornerDownLeft className="h-3 w-3" />
          </li>
          <li className="px-2 py-1.5 text-lp-muted">Join a group</li>
        </ul>
      </div>
    </div>
  );
}

// A 21×21 code: the three corner squares and timing lines of a real QR code, the rest a fixed pattern.
const QR_SIZE = 21;
const qrCell = (x: number, y: number) => {
  const finder = (fx: number, fy: number) => {
    const dx = x - fx;
    const dy = y - fy;
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) return null;
    const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return ring === 3 || ring <= 1;
  };
  const f = finder(0, 0) ?? finder(14, 0) ?? finder(0, 14);
  if (f !== null) return f;
  if ((x === 7 || y === 7) && (x < 8 && y < 8)) return false;
  if ((x === 13 && y < 8) || (y === 13 && x < 8) || (x < 8 && y === 7) || (x === 7 && y > 12)) return false;
  if (y === 6) return x % 2 === 0;
  if (x === 6) return y % 2 === 0;
  return ((x * 7 + y * 13 + x * y) % 5) < 2;
};
const QR_CELLS = Array.from({ length: QR_SIZE * QR_SIZE }, (_, i) => qrCell(i % QR_SIZE, Math.floor(i / QR_SIZE)));

/** Join with a QR code: a code in a viewfinder, scanned while you hover. */
export function QrArt() {
  return (
    <div className="relative flex h-full items-center justify-center gap-6 px-5">
      <div className="relative p-3">
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((corner) => (
          <span key={corner} className={`absolute h-5 w-5 rounded-[3px] border-lp-settled ${corner}`} />
        ))}
        <div className="grid gap-px rounded-md bg-[var(--fx-surface)] p-2" style={{ gridTemplateColumns: `repeat(${QR_SIZE}, 5px)` }}>
          {QR_CELLS.map((on, i) => (
            <span key={i} className={`h-[5px] w-[5px] ${on ? "bg-lp-ink" : ""}`} />
          ))}
        </div>
        <span className="pointer-events-none absolute inset-x-2 top-3 h-px bg-lp-settled shadow-[0_0_12px_2px_var(--lp-settled)] opacity-0 group-hover/fx:animate-[fx-scan_1.8s_ease-in-out_infinite] group-hover/fx:opacity-100 motion-reduce:hidden" />
      </div>
      <div className="hidden space-y-2 sm:block">
        <p className={`rounded-lg px-3 py-2 text-[13px] text-lp-ink ${glass}`}>Sylhet trip</p>
        <p className="px-1 text-[12px] text-lp-muted">4 people · ৳ BDT</p>
      </div>
    </div>
  );
}

/** Loans: money lent outside any group, with what's come back. */
export function LoanArt() {
  const back = 0.25;
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-full flex-col justify-center gap-2.5 px-5">
      <div className={`flex items-center gap-4 rounded-xl px-4 py-3 ${glass}`}>
        <svg viewBox="0 0 76 76" className="h-14 w-14 shrink-0 -rotate-90 sm:h-[68px] sm:w-[68px]">
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--lp-rule)" strokeWidth="7" />
          <circle cx="38" cy="38" r={r} fill="none" stroke="var(--lp-settled)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${c * back} ${c}`} />
        </svg>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[13px] text-lp-muted">Lent to Happy</p>
          <p className="text-[22px] font-semibold tabular-nums leading-7 text-lp-ink">{taka(2000)}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] tabular-nums text-lp-muted">
            {taka(500)} back
            <span className="whitespace-nowrap rounded-full bg-lp-owes/15 px-2 py-0.5 text-[11px] font-medium text-lp-owes">Due in 9 days</span>
          </p>
        </div>
      </div>
      <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-[13px] opacity-60 ${glass}`}>
        <span className="text-lp-muted">Borrowed from Popy</span>
        <span className="tabular-nums text-lp-ink">{taka(800)}</span>
      </div>
    </div>
  );
}
