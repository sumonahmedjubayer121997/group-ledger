import { container } from "../ui";

const facts = ["Free to use", "7 currencies, including ৳ BDT", "Equal, percent or exact splits", "PDF reports for every group"];

export function ProofStrip() {
  return (
    <section aria-label="At a glance" className="border-y border-lp-rule">
      <div className={container}>
        {/* 1 px gaps over a rule-coloured background draw the dividers between cells */}
        <ul className="grid grid-cols-2 gap-px bg-lp-rule md:grid-cols-4">
          {facts.map((fact) => (
            <li key={fact} className="bg-lp-paper px-4 py-5 text-sm text-lp-ink md:px-6 md:py-6">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
