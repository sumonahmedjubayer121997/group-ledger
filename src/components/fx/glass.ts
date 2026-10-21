/** A glass chip or panel on a lit card: a faint fill, an edge, and a highlight along the top. */
export const glass = "border border-[color:var(--fx-rim)] bg-[var(--fx-glass)] shadow-[inset_0_1px_0_var(--fx-rim-hi)]";

/** A glass row in a lit list: it casts a soft shadow and rises a pixel when hovered (not with "reduce motion"). */
export const glassRow = `rounded-xl ${glass} transition-[box-shadow,transform] duration-200 hover:shadow-[inset_0_1px_0_var(--fx-rim-hi),0_8px_20px_-12px_var(--fx-shadow)] motion-safe:hover:-translate-y-px`;
