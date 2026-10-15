import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useExpenseStore } from "@/stores/expenseStore";
import { joinGroupWithInviteCode, lookupInviteCode, type InviteCodeInfo } from "@/services/firebaseService";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "checking" | "ready" | "invalid" | "joining" | "joined" | "failed";

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-[60vh] items-center justify-center">{children}</div>
);

/** /join/:code: opens a group's invite link. Signed-out visitors see the sign-in page first (PublicApp). */
const JoinPage = () => {
  const { code = "" } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const groups = useExpenseStore((s) => s.groups);
  const [status, setStatus] = useState<Status>("checking");
  const [invite, setInvite] = useState<InviteCodeInfo | null>(null);

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

  const alreadyMember = !!invite && groups.some((g) => g.id === invite.groupId);

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
      setStatus("joined");
    } catch (error) {
      console.error("Error joining group:", error);
      setStatus("failed");
    }
  };

  if (!user) return null;

  let title = "Checking your invite…";
  let body = "";
  let action: React.ReactNode = null;

  if (status === "invalid") {
    title = "This invite link doesn't work";
    body = "It may have been replaced with a new link, or the group no longer allows joining by link. Ask the person who sent it for a new one.";
    action = <Button onClick={() => navigate("/")}>Go to your dashboard</Button>;
  } else if (invite && alreadyMember && status !== "joined") {
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
            {status === "checking" || status === "joined" ? (
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
