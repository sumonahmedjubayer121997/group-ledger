import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CardLight, type CardTone, type LightFrom } from "./TiltCard";
import { useTilt } from "./useTilt";

type LitPanelProps = {
  tone?: CardTone;
  light?: LightFrom;
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/**
 * A large card in the same light as TiltCard (coloured source, dot grid, glass edge, a spot that
 * follows the pointer) but without the tilt, so lists of buttons and links stay still under the
 * pointer. On phones the light follows a pressed finger and drifts as the card scrolls past.
 */
export function LitPanel({ tone = "plain", light = "top-left", className, children, ...aria }: LitPanelProps) {
  const { ref, handlers, style } = useTilt(0, 0);
  return (
    <motion.section
      ref={ref as never}
      {...handlers}
      style={style}
      {...aria}
      className={cn(
        "relative isolate min-w-0 rounded-2xl border border-[color:var(--fx-rim)] bg-[var(--fx-surface)] text-card-foreground",
        "shadow-[inset_0_1px_0_var(--fx-rim-hi),0_14px_34px_-22px_var(--fx-shadow)]",
        className
      )}
    >
      <CardLight tone={tone} light={light} />
      <div className="relative">{children}</div>
    </motion.section>
  );
}
