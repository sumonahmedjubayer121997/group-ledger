import { PrimaryButton, Reveal, SectionHeading, container } from "../ui";

export function FinalCta({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <section className="border-t border-lp-rule py-[72px] md:py-32">
      <Reveal className={`${container} flex flex-col items-center text-center`}>
        <SectionHeading>
          Settle up. <span className="italic">Stay friends.</span>
        </SectionHeading>
        <p className="mt-4 max-w-md text-base leading-6 text-lp-muted">
          Start a group in under a minute. Invite people now or later.
        </p>
        <PrimaryButton onClick={onGetStarted} className="mt-8">
          Get started, it's free
        </PrimaryButton>
      </Reveal>
    </section>
  );
}
