/** The SplitWize wordmark in the display serif, shared by the landing page and the app. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display text-[26px] leading-none tracking-[-0.01em] text-foreground ${className}`}>
      Split<span className="italic">Wize</span>
    </span>
  );
}
