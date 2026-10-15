import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, HandCoins, RotateCcw, Waypoints } from "lucide-react";
import { formatMoney } from "../money";
import { type Stage, debtsFor, people } from "./debtModel";
import { DebtWebPoster } from "./DebtWebPoster";
import { SceneBoundary } from "./SceneBoundary";

const DebtWeb = lazy(() => import("./DebtWeb"));

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);
const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;

/** The 3D scene only loads on devices that can comfortably run it. */
function canRun3D() {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    if (nav.connection?.saveData) return false;
    if ((nav.deviceMemory ?? 8) <= 4) return false;
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

const next: Record<Stage, { stage: Stage; label: string; Icon: typeof Waypoints }> = {
  tangled: { stage: "simplified", label: "Simplify", Icon: Waypoints },
  simplified: { stage: "settled", label: "Settle up", Icon: HandCoins },
  settled: { stage: "tangled", label: "Start again", Icon: RotateCcw },
};

export function HeroScene() {
  const reduce = useReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [inView, setInView] = useState(true);
  const [stage, setStage] = useState<Stage>("tangled");

  // The 3D scene (~235 KB) is a bonus: the drawn poster shows until someone reaches for the
  // illustration (pointer, touch or keyboard focus), so visitors who don't play never download it.
  const wantsScene = () => {
    if (!enabled && !reduce && canRun3D()) setEnabled(true);
  };

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const debts = debtsFor(stage);
  const total = debts.reduce((sum, d) => sum + d.amount, 0);
  const status =
    stage === "tangled"
      ? `${debts.length} debts · ${taka(total)} changing hands`
      : stage === "simplified"
        ? `${debts.length} payments · ${taka(total)} settles everyone`
        : "Everyone's square";
  const action = next[stage];

  return (
    <div>
      <div
        ref={frame}
        onPointerEnter={wantsScene}
        onPointerDown={wantsScene}
        onFocusCapture={wantsScene}
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-lp-rule bg-lp-surface"
      >
        <div className="absolute inset-0" aria-hidden="true">
          {enabled ? (
            <SceneBoundary fallback={<DebtWebPoster stage={stage} />} onError={() => setEnabled(false)}>
              <Suspense fallback={<DebtWebPoster stage={stage} />}>
                <DebtWeb stage={stage} active={inView} />
              </Suspense>
            </SceneBoundary>
          ) : (
            <DebtWebPoster stage={stage} />
          )}
        </div>

        <div className="pointer-events-none absolute left-4 top-4" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={stage}
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className={`inline-flex items-center gap-1.5 rounded-full border border-lp-rule bg-lp-paper px-3 py-1 text-[13px] tabular-nums ${
                stage === "settled" ? "text-lp-settled" : "text-lp-muted"
              }`}
            >
              {stage === "settled" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
              {status}
            </motion.p>
          </AnimatePresence>
        </div>

        <ul className="sr-only">
          {debts.length === 0 ? (
            <li>Nobody owes anybody.</li>
          ) : (
            debts.map((d) => (
              <li key={`${d.from}-${d.to}`}>
                {nameOf(d.from)} owes {nameOf(d.to)} {taka(d.amount)}
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onPointerEnter={wantsScene}
          onClick={() => {
            wantsScene();
            setStage(action.stage);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-lp-ink px-4 text-sm font-medium text-lp-ink transition-colors duration-150 hover:bg-lp-ink hover:text-lp-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled"
        >
          <action.Icon className="h-4 w-4" aria-hidden="true" />
          {action.label}
        </button>
        {enabled && <p className="text-[13px] text-lp-muted">Drag a friend to stretch the web.</p>}
      </div>
    </div>
  );
}
