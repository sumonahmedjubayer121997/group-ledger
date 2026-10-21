import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Check, Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { claimName, joinGroupWithInviteCode, lookupInviteCode, unclaimedNames, type InviteCodeInfo } from "@/services/firebaseService";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "checking" | "ready" | "invalid" | "joining" | "claim" | "claiming" | "joined" | "failed";
type Name = { id: string; name: string };

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-[60vh] items-center justify-center">{children}</div>
);

/**
 * /join/:code: opens a group's invite link. Signed-out visitors see the sign-in page first (PublicApp).
 * After joining, someone the group added by name ("Rahim") can say "that's me" and take over that
 * name's expenses and payments. A personal link (`?as=<id>`, from "Send invite") picks it for them.
 */
const JoinPage = () => {
  const { code = "" } = useParams<{ code: string }>();
  const [params] = useSearchParams();
  const asId = params.get("as") ?? "";
  const { user } = useAuth();
  const navigate = useNavigate();
  const groups = useExpenseStore((s) => s.groups);
  const [status, setStatus] = useState<Status>("checking");
  const [invite, setInvite] = useState<InviteCodeInfo | null>(null);
  const [names, setNames] = useState<Name[]>([]);
  const [pick, setPick] = useState("");
  const [claimError, setClaimError] = useState("");
  const [namesChecked, setNamesChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setStatus("checking");
    lookupInviteCode(code)
      .then((found) => {
        if (cancelled) return;
        setInvite(found);
        setStatus(found ? "ready" : "invalid");
      })
      .catch(() => !cancelled && setStatus("invalid"));
    return () => {
      cancelled = true;
    };
  }, [user, code]);

  const group = invite ? groups.find((g) => g.id === invite.groupId) : undefined;
  const alreadyMember = !!group;
  const claimedHere = !!user && Object.values(group?.aliases ?? {}).includes(user.uid);

  /** Offers the group's unclaimed names; true if there are any. */
  const offerNames = async (groupId: string) => {
    const found = await unclaimedNames(groupId).catch(() => [] as Name[]);
    setNamesChecked(true);
    if (!found.length) return false;
    setNames(found);
    setPick(found.some((n) => n.id === asId) ? asId : "");
    setStatus("claim");
    return true;
  };

  // A member who opens their personal link later can still claim their name.
  useEffect(() => {
    if (status === "ready" && invite && alreadyMember && asId && !claimedHere) void offerNames(invite.groupId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, invite, alreadyMember, asId, claimedHere]);

  // The group page needs the group in the local list, which arrives a moment after joining.
  useEffect(() => {
    if (status !== "joined" || !invite) return;
    if (alreadyMember) {
      navigate(`/groups/${invite.groupId}`, { replace: true });
      return;
    }
    const fallback = window.setTimeout(() => navigate("/", { replace: true }), 5000);
    return () => window.clearTimeout(fallback);
  }, [status, alreadyMember, invite, navigate]);

  const join = async () => {
    if (!user || !invite) return;
    setStatus("joining");
    try {
      await joinGroupWithInviteCode(user, invite, code);
      if (!(await offerNames(invite.groupId))) setStatus("joined");
    } catch (error) {
      console.error("Error joining group:", error);
      setStatus("failed");
    }
  };

  const claim = async () => {
    const name = names.find((n) => n.id === pick);
    if (!user || !invite || !name) return;
    setStatus("claiming");
    setClaimError("");
    try {
      await claimName(invite.groupId, name.id, user, name.name);
      setStatus("joined");
    } catch (error) {
      console.error("Error claiming name:", error);
      setClaimError(`Couldn't make you ${name.name}. Someone else may have just picked that name.`);
      setStatus("claim");
    }
  };

  if (!user) return null;

  // Looking up their name for a personal link (see the effect above).
  const lookingUp = !!invite && alreadyMember && status === "ready" && !!asId && !claimedHere && !namesChecked;

  let title = "Checking your invite…";
  let body = "";
  let action: React.ReactNode = null;

  if (status === "invalid") {
    title = "This invite link doesn't work";
    body = "It may have been replaced with a new link, or the group no longer allows joining by link. Ask the person who sent it for a new one.";
    action = <Button onClick={() => navigate("/")}>Go to your dashboard</Button>;
  } else if (invite && (status === "claim" || status === "claiming")) {
    const busy = status === "claiming";
    const chosen = names.find((n) => n.id === pick);
    title = "Are you one of these people?";
    body = `Someone added these names to ${invite.groupName} before you joined. Pick yours and its expenses and payments become yours.`;
    action = (
      <div className="w-full space-y-4">
        <div role="radiogroup" aria-label="Your name in the group" className="grid gap-2">
          {names.map((n) => (
            <button
              key={n.id}
              type="button"
              role="radio"
              aria-checked={pick === n.id}
              disabled={busy}
              onClick={() => setPick(n.id)}
              className={cn(
                "flex h-11 items-center justify-between rounded-md border px-3 text-left text-sm transition-colors",
                pick === n.id ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"
              )}
            >
              {n.name}
              {pick === n.id && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            </button>
          ))}
        </div>
        {claimError && (
          <p role="alert" className="text-sm text-destructive">
            {claimError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStatus("joined")} disabled={busy}>
            I'm not on this list
          </Button>
          <Button onClick={claim} disabled={!chosen || busy}>
            {busy ? "Saving…" : chosen ? `I'm ${chosen.name}` : "Pick your name"}
          </Button>
        </div>
      </div>
    );
  } else if (lookingUp) {
    // Keeps "Checking your invite…".
  } else if (invite && alreadyMember && status === "ready") {
    title = `You're already in ${invite.groupName}`;
    action = <Button onClick={() => navigate(`/groups/${invite.groupId}`)}>Open group</Button>;
  } else if (invite && (status === "ready" || status === "joining")) {
    title = `Join ${invite.groupName}?`;
    body = `You'll join as a member, see the group's expenses and balances, and be able to add expenses. You're signed in as ${user.email}.`;
    action = (
      <>
        <Button variant="outline" onClick={() => navigate("/")} disabled={status === "joining"}>
          Not now
        </Button>
        <Button onClick={join} disabled={status === "joining"}>
          {status === "joining" ? "Joining…" : "Join group"}
        </Button>
      </>
    );
  } else if (status === "joined") {
    title = "You're in!";
    body = "Opening the group…";
  } else if (status === "failed") {
    title = "Couldn't join the group";
    body = "The group may have stopped accepting link joins or changed its link. Ask the person who sent it for a new one.";
    action = <Button onClick={() => navigate("/")}>Go to your dashboard</Button>;
  }

  return (
    <Centered>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10" aria-hidden="true">
            {status === "checking" || status === "joined" || lookingUp ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Users className="h-5 w-5 text-primary" />
            )}
          </div>
          <CardTitle>{title}</CardTitle>
          {body && <CardDescription>{body}</CardDescription>}
        </CardHeader>
        {action && <CardFooter className="justify-end gap-2">{action}</CardFooter>}
      </Card>
    </Centered>
  );
};

export default JoinPage;
