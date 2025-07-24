import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useExpenseStore } from "@/stores/expenseStore";
import { useAuth } from "@/contexts/AuthContext";
import { GroupForm } from "./GroupForm";
import { GroupSettings } from "./GroupSettings";
import { GroupMemberManagement } from "./GroupMemberManagement";
import { EnhancedGroupForm } from "./EnhancedGroupForm";
import { toast } from "sonner";
import { 
  Plus, 
  Settings, 
  Users, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Copy, 
  Calendar, 
  MapPin, 
  Tag,
  Lock,
  Globe,
  Archive,
  RotateCcw
} from "lucide-react";
import type { Group } from "@/stores/expenseStore";

export const GroupManagement = () => {
  const { groups, updateGroup, archiveGroup, unarchiveGroup } = useExpenseStore();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCopyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied to clipboard!");
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      // For now, we'll archive instead of delete to preserve data
      await archiveGroup(groupId);
      toast.success("Group archived successfully!");
    } catch (error) {
      toast.error("Failed to archive group");
    }
  };

  const handleRestoreGroup = async (groupId: string) => {
    try {
      await unarchiveGroup(groupId);
      toast.success("Group restored successfully!");
    } catch (error) {
      toast.error("Failed to restore group");
    }
  };

  const isUserAdmin = (group: Group) => {
    return group.members.find(m => m.id === user?.uid)?.role === 'admin';
  };

  const activeGroups = groups.filter(g => !g.isArchived);
  const archivedGroups = groups.filter(g => g.isArchived);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Group Management</h1>
          <p className="text-muted-foreground">Create, manage, and organize your expense groups</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <EnhancedGroupForm 
              isOpen={isCreateOpen} 
              onClose={() => setIsCreateOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Groups */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Active Groups ({activeGroups.length})</h2>
        
        {activeGroups.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first group to start splitting expenses with friends and family.
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeGroups.map((group) => (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={group.photo} alt={group.name} />
                        <AvatarFallback>{group.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          {group.groupType === 'private' ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          <span className="capitalize">{group.groupType}</span>
                        </div>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background border shadow-md z-50">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        
                        {isUserAdmin(group) && (
                          <>
                            <DropdownMenuItem onClick={() => {
                              setSelectedGroup(group);
                              setIsEditOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Group
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setSelectedGroup(group);
                              setIsSettingsOpen(true);
                            }}>
                              <Settings className="mr-2 h-4 w-4" />
                              Settings
                            </DropdownMenuItem>
                          </>
                        )}
                        
                        <DropdownMenuItem onClick={() => {
                          setSelectedGroup(group);
                          setIsMembersOpen(true);
                        }}>
                          <Users className="mr-2 h-4 w-4" />
                          Manage Members
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem onClick={() => handleCopyInviteCode(group.inviteCode)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Invite Code
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        
                        {isUserAdmin(group) && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Archive className="mr-2 h-4 w-4" />
                                Archive Group
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Archive Group</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to archive "{group.name}"? This will hide the group but preserve all data. You can restore it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteGroup(group.id)}>
                                  Archive
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  )}
                  
                  {/* Group Info */}
                  <div className="space-y-2">
                    {group.location && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{group.location}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>Created {formatDate(group.createdAt)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-3 w-3 mr-1" />
                      <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  
                  {/* Tags */}
                  {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {group.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      {group.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{group.tags.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Settings Preview */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Currency: {group.settings.currency}</span>
                    <div className="flex items-center space-x-2">
                      {group.settings.notifications && (
                        <Badge variant="outline" className="text-xs">Notifications</Badge>
                      )}
                      {group.settings.simplifyDebts && (
                        <Badge variant="outline" className="text-xs">Simplified</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Archived Groups */}
      {archivedGroups.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-muted-foreground">
            Archived Groups ({archivedGroups.length})
          </h2>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {archivedGroups.map((group) => (
              <Card key={group.id} className="opacity-60 hover:opacity-80 transition-opacity">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={group.photo} alt={group.name} />
                        <AvatarFallback>{group.name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          {group.name}
                          <Badge variant="secondary" className="ml-2 text-xs">Archived</Badge>
                        </CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          {group.groupType === 'private' ? (
                            <Lock className="h-3 w-3" />
                          ) : (
                            <Globe className="h-3 w-3" />
                          )}
                          <span className="capitalize">{group.groupType}</span>
                        </div>
                      </div>
                    </div>
                    
                    {isUserAdmin(group) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Restore Group</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to restore "{group.name}"? This will make the group active again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRestoreGroup(group.id)}>
                              Restore
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-3 w-3 mr-1" />
                    <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dialogs */}
      {selectedGroup && (
        <>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogContent className="max-w-2xl">
              <GroupSettings group={selectedGroup} />
            </DialogContent>
          </Dialog>

          <Dialog open={isMembersOpen} onOpenChange={setIsMembersOpen}>
            <DialogContent className="max-w-2xl">
              <GroupMemberManagement group={selectedGroup} />
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-4xl">
              <EnhancedGroupForm 
                isOpen={isEditOpen} 
                onClose={() => setIsEditOpen(false)}
                group={selectedGroup}
                isEditing={true}
              />
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};