import { motion, useReducedMotion } from "framer-motion";
import { HeroCards } from "../hero/HeroCards";
import { EASE_OUT, Eyebrow, PrimaryButton, container, textLink } from "../ui";

const words: { text: string; italic?: boolean; breakAfter?: boolean }[] = [
  { text: "Split" },
  { text: "the" },
  { text: "bill,", breakAfter: true },
  { text: "not" },
  { text: "the" },
  { text: "friendship.", italic: true },
];

export function Hero({ onGetStarted }: { onGetStarted: () => void }) {
  const reduce = useReducedMotion();

  return (
    <section id="top" className={`${container} grid items-center gap-10 pb-16 pt-8 md:grid-cols-12 md:gap-6 md:pb-32 md:pt-20`}>
      <div className="md:col-span-6 lg:col-span-5">
        <Eyebrow>Shared expenses, settled</Eyebrow>
        <h1 className="mt-4 font-display text-[44px] font-normal leading-[48px] tracking-[-0.02em] text-lp-ink sm:text-[56px] sm:leading-[60px] lg:text-[72px] lg:leading-[76px]">
          {words.map((word, i) => (
            <span key={i}>
              <motion.span
                className={`inline-block ${word.italic ? "italic" : ""}`}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.05 + i * 0.04 }}
              >
                {word.text}
              </motion.span>
              {word.breakAfter ? <br /> : " "}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-7 text-lp-muted md:text-xl md:leading-[30px]">
          Log shared costs with friends, roommates and travel groups. SplitWize works out who owes whom, so settling
          up stays simple and friendly.
        </p>
        <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <PrimaryButton onClick={onGetStarted} className="w-full sm:w-auto">
            Get started, it's free
          </PrimaryButton>
          <a href="#how-it-works" className={`${textLink} text-[15px] font-medium`}>
            See how it works
          </a>
        </div>
        <p className="mt-6 text-[13px] text-lp-muted">No card needed. Works in your browser.</p>
      </div>

      <div className="min-w-0 md:col-span-6 lg:col-span-6 lg:col-start-7">
        <HeroCards />
      </div>
    </section>
  );
}
