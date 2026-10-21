import { useState } from "react";
import { MailCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { mergeTemporaryUserWithRealUser, registerEmailIndex } from "@/services/firebaseService";

const key = (uid: string) => `splitwize:verify-line-dismissed:${uid}`;

const dismissedBefore = (uid: string) => {
  try {
    return localStorage.getItem(key(uid)) === "1";
  } catch {
    return false;
  }
};

/**
 * Until the email is verified, one quiet line on the Overview: unverified people can't be added
 * by email or accept email invites, and otherwise never find out why.
 */
export function VerifyEmailLine() {
  const { user, resendVerificationEmail, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [hidden, setHidden] = useState(() => !user || dismissedBefore(user.uid));
  const [busy, setBusy] = useState<"send" | "check" | null>(null);
  if (!user || user.emailVerified || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(key(user.uid), "1");
    } catch {
      /* it just shows again next time */
    }
    setHidden(true);
  };

  const send = async () => {
    setBusy("send");
    try {
      await resendVerificationEmail();
      toast({ title: "Verification email sent", description: `Open the link we sent to ${user.email}, then tap "I've done it".` });
    } catch {
      toast({ title: "Couldn't send the email", description: "Please try again in a minute.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  // Same as Profile → Account: picks up the new status without signing out.
  const check = async () => {
    setBusy("check");
    try {
      await user.reload();
      if (!user.emailVerified) {
        toast({ title: "Not verified yet", description: "Open the link in the email we sent, then try again." });
        return;
      }
      await user.getIdToken(true);
      await updateUserProfile({ verified: true, emailVerified: true });
      await registerEmailIndex(user);
      await mergeTemporaryUserWithRealUser(user);
      toast({ title: "Email verified", description: "Friends can now add you by email." });
      setHidden(true);
    } catch {
      toast({ title: "Couldn't check right now", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Verify your email" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-4 py-2.5 text-sm">
      <MailCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1">Verify your email so friends can add you.</p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={send} disabled={busy !== null}>
          {busy === "send" ? "Sending…" : "Send again"}
        </Button>
        <Button size="sm" onClick={check} disabled={busy !== null}>
          {busy === "check" ? "Checking…" : "I've done it"}
        </Button>
        <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9 text-muted-foreground" onClick={dismiss} aria-label="Hide this">
          <X aria-hidden="true" />
        </Button>
      </div>
    </section>
  );
}
