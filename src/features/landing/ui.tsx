import { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const container = "mx-auto w-full max-w-[1200px] px-4 sm:px-6";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled focus-visible:ring-offset-2 focus-visible:ring-offset-lp-paper disabled:pointer-events-none disabled:opacity-60";

export const fieldClass =
  "h-11 w-full rounded-[10px] border border-lp-rule bg-lp-paper px-3 text-[15px] text-lp-ink placeholder:text-lp-muted transition-colors duration-150 hover:border-lp-muted focus:border-lp-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { size?: "md" | "lg" };

export function PrimaryButton({ children, className = "", size = "lg", ...props }: ButtonProps) {
  const height = size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm";
  return (
    <button
      type="button"
      className={`group inline-flex items-center justify-center gap-2 rounded-[10px] bg-lp-ink font-medium text-lp-paper transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.98] motion-reduce:transform-none ${height} ${focusRing} ${className}`}
      {...props}
    >
      {children}
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
      />
    </button>
  );
}

export function SecondaryButton({ children, className = "", size = "lg", ...props }: ButtonProps) {
  const height = size === "lg" ? "h-12 px-6 text-[15px]" : "h-10 px-4 text-sm";
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center rounded-[10px] border border-lp-ink font-medium text-lp-ink transition-colors duration-150 hover:bg-lp-ink hover:text-lp-paper ${height} ${focusRing} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const textLink = `text-lp-settled underline-offset-4 hover:underline ${focusRing} rounded-sm`;

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[13px] font-medium uppercase leading-[18px] tracking-[0.08em] text-lp-muted ${className}`}>
      {children}
    </p>
  );
}

export function SectionHeading({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={`font-display text-[32px] font-normal leading-[36px] tracking-[-0.01em] text-lp-ink md:text-[44px] md:leading-[48px] ${className}`}
    >
      {children}
    </h2>
  );
}

/** Fades and lifts its children into place once, the first time they scroll into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
