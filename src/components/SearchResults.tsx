import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  Users,
  User,
  Calendar,
  Tag,
  DollarSign,
  Search,
  Group as GroupIcon,
} from "lucide-react";
import { Expense, Group, Member } from "@/stores/expenseStore";
import { useExpenseStore } from "@/stores/expenseStore";
import { format, formatDistanceToNow } from "date-fns";

interface SearchResultsProps {
  expenses: Expense[];
  groups: Group[];
  members: Member[];
  searchQuery: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  expenses,
  groups,
  members,
  searchQuery,
}) => {
  const { setSelectedGroup } = useExpenseStore();

  // Helper function to get group name by groupId
  const getGroupName = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    return group ? group.name : `Group ${groupId}`;
  };

  const totalResults = expenses.length + groups.length + members.length;

  if (totalResults === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Search className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No results found
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "Try adjusting your search criteria"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Results ({totalResults})
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-4">
          {expenses.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No expenses found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card
                  key={expense.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold truncate">
                            {expense.description}
                          </h3>
                          <Badge variant="outline">{expense.category}</Badge>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>Paid by X{expense.paidBy.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <GroupIcon className="h-3 w-3" />
                            <span>Group: {getGroupName(expense.groupId)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {format(new Date(expense.date), "PPP")} (
                              {formatDistanceToNow(new Date(expense.date), {
                                addSuffix: true,
                              })}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>
                              Split among:{" "}
                              {expense.splitAmong.map((m) => m.name).join(", ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 text-lg font-bold">
                          <DollarSign className="h-4 w-4" />
                          {expense.amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          {groups.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No groups found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold truncate">
                            {group.name}
                          </h3>
                        </div>

                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {group.description}
                          </p>
                        )}

                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            <span>{group.members.length} members</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-3 w-3" />
                            <span>Currency: {group.settings.currency}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {group.members.slice(0, 3).map((member) => (
                            <Badge
                              key={member.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {member.name}
                            </Badge>
                          ))}
                          {group.members.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{group.members.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(group)}
                      >
                        View Group
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          {members.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No members found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {member.name}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {member.email}
                        </p>
                        {member.role && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            {member.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
