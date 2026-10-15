import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GroupDetailView } from "@/components/GroupDetailView";
import { PageHeader } from "@/components/PageHeader";
import { PageSkeleton } from "@/components/PageSkeleton";
import { useExpenseStore } from "@/stores/expenseStore";

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const group = useExpenseStore((s) => s.groups.find((g) => g.id === groupId));
  const groupsLoaded = useExpenseStore((s) => s.groupsLoaded);
  const setSelectedGroup = useExpenseStore((s) => s.setSelectedGroup);

  // Some older components still read the open group from the store.
  useEffect(() => {
    if (group) setSelectedGroup(group);
    return () => setSelectedGroup(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, setSelectedGroup]);

  if (!groupsLoaded) return <PageSkeleton />;

  if (!group) {
    return (
      <>
        <PageHeader
          back={{ to: "/", label: "Overview" }}
          title="Group not found"
          description="It may have been deleted, or you're no longer a member."
        />
        <Button asChild>
          <Link to="/">Back to your groups</Link>
        </Button>
      </>
    );
  }

  return <GroupDetailView group={group} />;
};

export default GroupDetailPage;
