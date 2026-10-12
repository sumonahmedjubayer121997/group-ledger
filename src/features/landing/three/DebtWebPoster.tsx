import { formatMoney } from "../money";
import { type PersonId, type Stage, debtsFor, indexOf, labelAt, maxAmount, maxNet, nets, pairKey, people } from "./debtModel";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);

const point = (id: PersonId): [number, number] => {
  const [x, y] = people[indexOf(id)].home;
  return [200 + x * 46, 145 - y * 46];
};

/** Flat drawing of the debt web, for reduced motion, low-power devices and while the 3D scene loads. */
export function DebtWebPoster({ stage }: { stage: Stage }) {
  const debts = debtsFor(stage);

  return (
    <svg viewBox="0 0 400 300" className="h-full w-full" aria-hidden="true" focusable="false">
      {debts.map((d) => {
        const [x1, y1] = point(d.from);
        const [x2, y2] = point(d.to);
        return (
          <line
            key={`line-${d.from}-${d.to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--lp-ink)"
            strokeWidth={1.2 + (5 * d.amount) / maxAmount}
            strokeLinecap="round"
          />
        );
      })}

      {debts.map((d) => {
        const [x1, y1] = point(d.from);
        const [x2, y2] = point(d.to);
        const at = labelAt[pairKey(d.from, d.to)] ?? 0.5;
        const text = taka(d.amount);
        const w = text.length * 6.6 + 10;
        const lx = x1 + (x2 - x1) * at;
        const ly = y1 + (y2 - y1) * at;
        return (
          <g key={`chip-${d.from}-${d.to}`}>
            <rect x={lx - w / 2} y={ly - 9} width={w} height="18" rx="4" fill="var(--lp-paper)" stroke="var(--lp-rule)" />
            <text x={lx} y={ly + 4} textAnchor="middle" fontSize="11" fill="var(--lp-ink)" className="font-inter tabular-nums">
              {text}
            </text>
          </g>
        );
      })}

      {people.map((person) => {
        const [x, y] = point(person.id);
        const r = 11 + 9 * Math.sqrt(Math.abs(nets[person.id]) / maxNet);
        const fill = stage === "settled" ? "var(--lp-settled)" : nets[person.id] > 0 ? "var(--lp-ink)" : "var(--lp-owes)";
        return (
          <g key={person.id}>
            <circle cx={x} cy={y} r={r} fill={fill} />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--lp-paper)" className="font-inter">
              {person.name[0]}
            </text>
            <text
              x={person.label === "left" ? x - r - 6 : person.label === "right" ? x + r + 6 : x}
              y={person.label === "top" ? y - r - 7 : person.label === "bottom" ? y + r + 15 : y + 4}
              textAnchor={person.label === "left" ? "end" : person.label === "right" ? "start" : "middle"}
              fontSize="12"
              fontWeight="500"
              fill="var(--lp-ink)"
              className="font-inter"
            >
              {person.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
