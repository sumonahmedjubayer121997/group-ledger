/**
 * A small balance scale that levels out as the form fills in: coins land on the right
 * pan with each finished field, and the beam turns green once everything is ready.
 * Plain SVG + CSS transitions, so it costs almost nothing to load.
 */
export function AuthScale({ progress }: { progress: number }) {
  const p = Math.max(0, Math.min(1, progress));
  const balanced = p >= 1;
  const rightCoins = Math.round(p * 3);
  const angle = -9 * (1 - p);
  const coinStroke = balanced ? "var(--lp-settled)" : "var(--lp-owes)";

  const coin = (key: string, x: number, y: number, extraClass = "") => (
    <rect
      key={key}
      x={x - 15}
      y={y}
      width="30"
      height="7"
      rx="3.5"
      fill="var(--lp-paper)"
      stroke={coinStroke}
      strokeWidth="2"
      className={`transition-[stroke] duration-500 motion-reduce:transition-none ${extraClass}`}
    />
  );

  const right: [number, number][] = [
    [288, 123],
    [250, 123],
    [288, 115],
  ];

  return (
    <svg viewBox="0 0 400 260" className="h-auto w-full" aria-hidden="true" focusable="false">
      <ellipse cx="200" cy="232" rx="130" ry="7" fill="var(--lp-ink)" opacity="0.07" />
      <rect x="166" y="226" width="68" height="5" rx="2" fill="var(--lp-ink)" />
      <rect x="195" y="140" width="10" height="88" fill="var(--lp-ink)" />

      <g
        style={{
          transform: `rotate(${angle}deg)`,
          transformOrigin: "200px 134px",
          transformBox: "view-box",
        }}
        className="transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none"
      >
        <rect
          x="72"
          y="131"
          width="256"
          height="6"
          rx="2"
          fill={balanced ? "var(--lp-settled)" : "var(--lp-ink)"}
          className="transition-[fill] duration-500 motion-reduce:transition-none"
        />
        <rect x="72" y="122" width="4" height="10" fill={balanced ? "var(--lp-settled)" : "var(--lp-ink)"} />
        <rect x="324" y="122" width="4" height="10" fill={balanced ? "var(--lp-settled)" : "var(--lp-ink)"} />
        {coin("l1", 112, 123)}
        {coin("l2", 112, 115)}
        {coin("l3", 150, 123)}
        {right.slice(0, rightCoins).map(([x, y], i) => coin(`r${i}`, x, y, "animate-coin-drop motion-reduce:animate-none"))}
      </g>

      <circle cx="200" cy="134" r="6" fill="var(--lp-ink)" />
    </svg>
  );
}
