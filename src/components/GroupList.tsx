import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Group, useExpenseStore } from "@/stores/expenseStore";
import { Users, Calendar, User } from "lucide-react";
import { GroupExpensesList } from "./GroupExpensesList";

interface GroupListProps {
  groups: Group[];
  onGroupClick?: (group: Group) => void;
}

export const GroupList: React.FC<GroupListProps> = ({
  groups,
  onGroupClick,
}) => {
  const { expenses } = useExpenseStore();
  if (groups.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center space-x-2 text-base sm:text-lg text-card-foreground">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            <span>Groups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 sm:py-8">
            <Users className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground/50 mx-auto mb-3 sm:mb-4" />
            <p className="text-muted-foreground mb-2 text-sm sm:text-base">
              No groups yet
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground/70">
              Create your first group to start tracking shared expenses!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Groups Overview */}
      <Card className="bg-card/80 backdrop-blur-sm border-border shadow-lg">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
              <span className="text-base sm:text-lg text-card-foreground">
                Groups
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-green-500 border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50 dark:text-green-400 dark:border-green-400/30 dark:hover:bg-green-400/10 text-xs sm:text-sm"
            >
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {groups.map((group) => (
              <div
                key={group.id}
                className="p-3 sm:p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer border border-border/50"
                onClick={() => onGroupClick?.(group)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-card-foreground text-sm sm:text-base truncate pr-2">
                    {group.name}
                  </h4>
                  <div className="flex -space-x-1 sm:-space-x-2">
                    {group.members.slice(0, 3).map((member, index) => (
                      <Avatar
                        key={member.id}
                        className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-background"
                      >
                        {member.photoURL ? (
                          <AvatarImage
                            src={member.photoURL}
                            alt={member.name}
                          />
                        ) : null}
                        <AvatarFallback className="text-xs bg-primary/10 text-primary border border-primary/20">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.members.length > 3 && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-muted rounded-full flex items-center justify-center border-2 border-background">
                        <span className="text-muted-foreground font-medium text-xs">
                          +{group.members.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                  {group.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{group.members.length} members</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span className="hidden sm:inline">
                      {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                    <span className="sm:hidden">
                      {new Date(group.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses for Each Group */}
      {groups.map((group) => (
        <GroupExpensesList
          key={`expenses-${group.id}`}
          group={group}
          expenses={expenses}
          maxExpenses={3}
        />
      ))}
    </div>
  );
};
