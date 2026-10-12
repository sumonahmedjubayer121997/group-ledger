import { ReactNode } from "react";
import { formatMoney } from "../money";
import { Eyebrow, Reveal, SectionHeading, container } from "../ui";

const taka = (amount: number) => formatMoney(amount * 100, "BDT", 0);

const categories = [
  { name: "Stay", amount: 6000 },
  { name: "Travel", amount: 2400 },
  { name: "Food", amount: 1800 },
];
const largest = Math.max(...categories.map((c) => c.amount));

const currencies = ["৳ BDT", "$ USD", "€ EUR", "£ GBP", "$ CAD", "$ AUD", "¥ JPY"];

function Tile({ title, body, children, className = "" }: { title: string; body: string; children: ReactNode; className?: string }) {
  return (
    <article
      className={`group flex flex-col rounded-2xl border border-lp-rule bg-lp-surface p-6 transition-colors duration-150 hover:border-lp-ink ${className}`}
    >
      <div className="flex-1">{children}</div>
      <h3 className="mt-6 text-lg font-semibold text-lp-ink">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-6 text-lp-muted">{body}</p>
    </article>
  );
}

const grow =
  "origin-left scale-x-[0.88] transition-transform duration-500 ease-out group-hover:scale-x-100 motion-reduce:scale-x-100 motion-reduce:transition-none";

export function Features() {
  return (
    <section id="features" className="scroll-mt-16 border-t border-lp-rule py-[72px] md:py-32">
      <div className={container}>
        <Reveal>
          <Eyebrow>Features</Eyebrow>
          <SectionHeading className="mt-3 max-w-xl">Everything a shared wallet needs. Nothing it doesn't.</SectionHeading>
        </Reveal>

        <div className="mt-10 grid gap-4 md:mt-16 md:grid-cols-12">
          <Reveal className="md:col-span-6 md:row-span-2">
            <Tile
              className="h-full"
              title="See where the money goes"
              body="Charts by category and by person show where a trip's money went, and every group exports to a PDF report."
            >
              <p className="text-[13px] text-lp-muted">Sylhet trip · by category</p>
              <ul className="mt-5 space-y-4">
                {categories.map((c) => (
                  <li key={c.name}>
                    <div className="flex justify-between text-sm">
                      <span className="text-lp-ink">{c.name}</span>
                      <span className="tabular-nums text-lp-muted">{taka(c.amount)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-lp-rule">
                      <div className={`h-full rounded-full bg-lp-ink ${grow}`} style={{ width: `${(c.amount / largest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-6" delay={0.06}>
            <Tile className="h-full" title="Every currency you travel with" body="Each group keeps its own currency, from taka to yen.">
              <ul className="flex flex-wrap gap-2">
                {currencies.map((c) => (
                  <li
                    key={c}
                    className="rounded-[8px] border border-lp-rule px-2.5 py-1 text-[13px] text-lp-ink transition-colors duration-150 group-hover:border-lp-muted"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-3" delay={0.12}>
            <Tile className="h-full" title="Budgets that speak up" body="Get a warning before a group overspends.">
              <div className="flex justify-between text-[13px]">
                <span className="text-lp-muted">Food</span>
                <span className="tabular-nums text-lp-owes">82%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-lp-rule">
                <div className={`h-full w-[82%] rounded-full bg-lp-owes ${grow}`} />
              </div>
            </Tile>
          </Reveal>

          <Reveal className="md:col-span-3" delay={0.18}>
            <Tile className="h-full" title="Plan it together" body="Chat, polls, tasks and pinned notes sit next to the expenses.">
              <div className="space-y-2 text-[13px]">
                <p className="w-fit max-w-[85%] rounded-[10px] rounded-bl-[4px] border border-lp-rule px-3 py-1.5 text-lp-ink">
                  Who's booking the bus?
                </p>
                <p className="ml-auto w-fit max-w-[85%] rounded-[10px] rounded-br-[4px] bg-lp-ink px-3 py-1.5 text-lp-paper transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none">
                  On it, added to tasks
                </p>
              </div>
            </Tile>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
