import type { CSSProperties, ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTilt } from "./useTilt";

export type CardTone = "settled" | "owes" | "plain";

const toneGlow: Record<CardTone, string> = {
  settled: "var(--fx-glow-settled)",
  owes: "var(--fx-glow-owes)",
  plain: "var(--fx-glow-plain)",
};
const toneLine: Record<CardTone, string> = {
  settled: "var(--lp-settled)",
  owes: "var(--lp-owes)",
  plain: "var(--lp-muted)",
};

/** Where the card's one coloured light falls from. */
export type LightFrom = "top-right" | "top-left" | "top";
const source: Record<LightFrom, string> = {
  "top-right": "radial-gradient(75% 65% at 100% 0%, var(--fx-tone), transparent 70%)",
  "top-left": "radial-gradient(75% 65% at 0% 0%, var(--fx-tone), transparent 70%)",
  top: "radial-gradient(50% 60% at 50% 0%, var(--fx-tone), transparent 72%)",
};
const dotsAt: Record<LightFrom, string> = { "top-right": "90% 0%", "top-left": "10% 0%", top: "50% 0%" };

// A 1px border lit where the pointer is (the "glass edge"): a gradient masked to the border only.
const rimStyle: CSSProperties = {
  padding: 1,
  background: "radial-gradient(260px circle at var(--mx, 70%) var(--my, 0%), var(--fx-rim-hi), transparent 65%)",
  WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
  WebkitMaskComposite: "xor",
  maskComposite: "exclude",
};

type TiltCardProps = {
  tone?: CardTone;
  light?: LightFrom;
  /** The illustration at the top; decorative, hidden from screen readers. */
  art?: ReactNode;
  artClassName?: string;
  title?: ReactNode;
  children?: ReactNode;
  /** Makes the whole card a link (Insights' question cards). */
  to?: string;
  /** Most it tilts, in degrees; small cards use less. */
  max?: number;
  className?: string;
  bodyClassName?: string;
};

const MotionLink = motion.create(Link);

/**
 * A lit card in the style of the reference designs: one coloured light, a dot grid, a glass edge,
 * and an illustration that sits a little in front of the text when the card tilts. Tilt, light and
 * depth come from useTilt; "reduce motion" leaves a still, lit card. The meaning is always in the
 * title and text, never only in the picture.
 */
export function TiltCard({
  tone = "plain",
  light = "top-right",
  art,
  artClassName,
  title,
  children,
  to,
  max = 6,
  className,
  bodyClassName,
}: TiltCardProps) {
  const { ref, handlers, style, shadowX, shadowY } = useTilt(max);
  const vars = { "--fx-tone": toneGlow[tone], transformStyle: "preserve-3d" } as CSSProperties;
  const cardClass = cn(
    "group/fx relative flex h-full touch-pan-y flex-col rounded-2xl border border-[color:var(--fx-rim)] bg-[var(--fx-surface)] text-left",
    "shadow-[inset_0_1px_0_var(--fx-rim-hi)]",
    to && "rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled focus-visible:ring-offset-2 focus-visible:ring-offset-lp-paper"
  );

  const inner = (
    <>
      {/* Light, clipped to the card (clipping would flatten the 3D layers, so they live in their own layer). */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <span className="absolute inset-0 transition-opacity" style={{ background: source[light], opacity: "calc(0.8 + var(--lit, 0) * 0.2)" }} />
        <span
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(var(--fx-dot) 1px, transparent 1px)",
            backgroundSize: "14px 14px",
            maskImage: `radial-gradient(70% 70% at ${dotsAt[light]}, #000, transparent 75%)`,
            WebkitMaskImage: `radial-gradient(70% 70% at ${dotsAt[light]}, #000, transparent 75%)`,
          }}
        />
        <span
          className="absolute inset-0"
          style={{
            background: "radial-gradient(380px circle at var(--mx, 70%) var(--my, 20%), var(--fx-spot), transparent 65%)",
            opacity: "calc(0.35 + var(--lit, 0) * 0.65)",
          }}
        />
        {light === "top" && (
          <span
            className="absolute left-1/2 top-0 h-px w-2/5 -translate-x-1/2"
            style={{ background: `linear-gradient(90deg, transparent, ${toneLine[tone]}, transparent)` }}
          />
        )}
      </span>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit]" style={{ ...rimStyle, opacity: "calc(0.3 + var(--lit, 0) * 0.7)" }} />

      {art && (
        <div
          aria-hidden="true"
          className={cn("relative mx-3 mt-3 overflow-hidden rounded-xl", artClassName)}
          // In front of the text only while tilting, so a still card isn't magnified by the perspective.
          style={{ transform: "translateZ(calc(var(--lit, 0) * 36px))" }}
        >
          {art}
        </div>
      )}
      <div className={cn("relative mt-auto p-5 md:p-6", bodyClassName)} style={{ transform: "translateZ(calc(var(--lit, 0) * 18px))" }}>
        {title && <h3 className="text-[17px] font-semibold leading-6 text-lp-ink">{title}</h3>}
        {children}
      </div>
    </>
  );

  return (
    <div className={cn("relative h-full min-w-0 [perspective:1000px]", className)}>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 bottom-0 top-8 rounded-2xl bg-[var(--fx-shadow)] opacity-50 blur-2xl"
        style={{ x: shadowX, y: shadowY }}
      />
      {to ? (
        <MotionLink ref={ref as never} to={to} {...handlers} style={{ ...vars, ...style }} className={cardClass}>
          {inner}
        </MotionLink>
      ) : (
        <motion.article ref={ref as never} {...handlers} style={{ ...vars, ...style }} className={cardClass}>
          {inner}
        </motion.article>
      )}
    </div>
  );
}
