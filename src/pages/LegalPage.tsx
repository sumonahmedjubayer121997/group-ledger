import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Wordmark } from "@/features/landing/sections/Nav";
import { container, textLink } from "@/features/landing/ui";

const UPDATED = "21 October 2026";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-[26px] leading-tight text-lp-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-7 text-lp-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-lp-ink">{children}</div>
    </section>
  );
}

/** inApp: shown inside the signed-in app, which has its own header. */
function LegalShell({ title, lead, inApp, children }: { title: string; lead: string; inApp?: boolean; children: ReactNode }) {
  return (
    <div className={inApp ? "text-foreground" : "min-h-screen bg-lp-paper font-inter text-lp-ink antialiased"}>
      {!inApp && (
      <header className="border-b border-lp-rule">
        <div className={`${container} flex h-16 items-center justify-between`}>
          <Link to="/" aria-label="SplitWize home" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-settled">
            <Wordmark />
          </Link>
          <Link to="/" className={`${textLink} text-sm`}>
            Back to SplitWize
          </Link>
        </div>
      </header>
      )}
      <main className={inApp ? "max-w-[720px] pb-8" : `${container} max-w-[720px] py-12 md:py-20`}>
        <h1 className="font-display text-[40px] leading-[44px] tracking-[-0.01em] md:text-[52px] md:leading-[56px]">{title}</h1>
        <p className="mt-3 text-sm text-lp-muted">Last updated {UPDATED}</p>
        <p className="mt-6 text-[17px] leading-7">{lead}</p>
        {children}
        <p className="mt-12 border-t border-lp-rule pt-6 text-sm text-lp-muted">
          Questions? Get in touch through{" "}
          <a href="https://sumonahmed.info" target="_blank" rel="noopener noreferrer" className={textLink}>
            sumonahmed.info
          </a>
          .
        </p>
      </main>
    </div>
  );
}

/** What SplitWize keeps, who can see it, and how to take it out or delete it. */
export function PrivacyPage({ inApp }: { inApp?: boolean }) {
  return (
    <LegalShell
      inApp={inApp}
      title="Privacy"
      lead="SplitWize keeps what it needs to split costs with your friends, shows it only to the people you share it with, and lets you download or delete it at any time. No ads, no selling data, no third-party trackers."
    >
      <Section title="What we keep">
        <ul>
          <li>
            <strong>Your account:</strong> your name, email address and, if you add one, a profile photo. If you sign in with Google, we receive your
            name, email and photo from Google.
          </li>
          <li>
            <strong>What you add:</strong> groups, the people in them, expenses, payments you mark as paid, comments, chat messages and budgets.
          </li>
          <li>
            <strong>Personal records:</strong> loans you record under Personal. These are visible only to you.
          </li>
          <li>
            <strong>Settings:</strong> your currency, theme and notification choices, including groups you've muted.
          </li>
          <li>
            <strong>Anonymous counts:</strong> how often a few things happen (opening the app, adding an expense, marking a payment) and how long
            they take. These never include amounts, descriptions, names or anything that identifies you.
          </li>
        </ul>
      </Section>

      <Section title="Who can see it">
        <ul>
          <li>People in a group see that group's expenses, payments, balances, chat and members.</li>
          <li>People using SplitWize, such as those in your groups, can see your name and profile photo.</li>
          <li>Someone who types your exact email address can add you to a group. Nobody can browse or search the list of users.</li>
          <li>Your loans, personal budgets and settings are visible only to you.</li>
        </ul>
      </Section>

      <Section title="Where it's stored">
        <p>
          Your data is stored with Google Firebase (Authentication, Cloud Firestore and Cloud Storage), and the app is served from Firebase
          Hosting. Security rules decide who can read or change each record, and they're tested before every release.
        </p>
        <p>
          To work offline, the app keeps a copy of your data on your device. It's cleared when you sign out. A few preferences, such as the last
          payment method you used, stay in your browser's storage.
        </p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>
            <strong>Download your data</strong> from Profile → Privacy, as a file you can keep.
          </li>
          <li>
            <strong>Delete your account</strong> from Profile → Privacy. This removes your profile and photo, loans, budgets, settings and
            notifications, and your sign-in. In groups you share with others, your place stays as "Your name (left)" so everyone else's balances still add up.
          </li>
          <li>
            <strong>Turn off notifications</strong> by type, or mute a single group, from the bell.
          </li>
        </ul>
      </Section>

      <Section title="Changes">
        <p>If this page changes in a way that matters, the date at the top changes and the app will say so.</p>
      </Section>
    </LegalShell>
  );
}

/** The plain-language terms of using SplitWize. */
export function TermsPage({ inApp }: { inApp?: boolean }) {
  return (
    <LegalShell
      inApp={inApp}
      title="Terms"
      lead="SplitWize is a free tool for keeping track of shared costs. These terms say what you can expect from it and what it expects from you."
    >
      <Section title="What SplitWize does">
        <p>
          SplitWize records expenses and works out who owes whom. It doesn't hold, send or receive money. "Mark as paid" only records that a
          payment happened somewhere else, such as in cash or through bKash or a bank.
        </p>
      </Section>

      <Section title="Your part">
        <ul>
          <li>Keep your sign-in details to yourself; you're responsible for what's done with your account.</li>
          <li>Enter amounts and payments honestly. Balances are only as right as what people put in.</li>
          <li>Only add people who'd expect to be added, and don't use SplitWize to harass, mislead or defraud anyone.</li>
          <li>Don't try to get at data that isn't shared with you, or to disrupt the service.</li>
        </ul>
      </Section>

      <Section title="The service">
        <ul>
          <li>SplitWize is free. Features may change, be added or be removed.</li>
          <li>
            It's provided as it is. We work to keep it running and your numbers right, but we can't promise it will never be unavailable or
            wrong, and we aren't liable for losses that come from relying on it. Check important amounts before you pay.
          </li>
          <li>We may suspend accounts that break these terms.</li>
        </ul>
      </Section>

      <Section title="Leaving">
        <p>
          You can stop using SplitWize and delete your account at any time from Profile → Privacy. What happens to your data is described on the{" "}
          <Link to="/privacy" className={textLink}>
            Privacy
          </Link>{" "}
          page.
        </p>
      </Section>
    </LegalShell>
  );
}
