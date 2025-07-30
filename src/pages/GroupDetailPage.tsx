import { useParams, useNavigate } from "react-router-dom";
import { useExpenseStore } from "@/stores/expenseStore";
import { GroupDetailView } from "@/components/GroupDetailView";
import { useEffect } from "react";

const GroupDetailPage = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { groups, setSelectedGroup, selectedGroup } = useExpenseStore();

  useEffect(() => {
    if (groupId && groups.length > 0) {
      const group = groups.find(g => g.id === groupId);
      if (group) {
        setSelectedGroup(group);
      } else {
        // Group not found, redirect to dashboard
        navigate('/');
      }
    }
  }, [groupId, groups, setSelectedGroup, navigate]);

  const handleBack = () => {
    setSelectedGroup(null);
    navigate('/');
  };

  if (!selectedGroup) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <GroupDetailView 
        group={selectedGroup} 
        onBack={handleBack} 
      />
    </div>
  );
};

export default GroupDetailPage;