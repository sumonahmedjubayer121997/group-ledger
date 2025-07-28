import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Send, Reply, Edit, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCommentStore, ExpenseComment } from '@/stores/commentStore';
import { useAuth } from '@/contexts/AuthContext';
import { Expense } from '@/stores/expenseStore';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ExpenseCommentsProps {
  expense: Expense;
  isOpen: boolean;
  onClose: () => void;
}

export const ExpenseComments: React.FC<ExpenseCommentsProps> = ({ expense, isOpen, onClose }) => {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const { 
    addComment, 
    updateComment, 
    deleteComment, 
    getThreadedComments, 
    replyToComment 
  } = useCommentStore();

  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const comments = getThreadedComments(expense.id);

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return;

    addComment({
      expenseId: expense.id,
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'Anonymous',
      userPhoto: userProfile?.photoURL || user.photoURL || undefined,
      content: newComment.trim(),
    });

    setNewComment('');
    toast({
      title: "Comment added",
      description: "Your comment has been added successfully",
    });
  };

  const handleReply = (parentId: string) => {
    if (!replyContent.trim() || !user) return;

    replyToComment({
      expenseId: expense.id,
      userId: user.uid,
      userName: userProfile?.displayName || user.displayName || 'Anonymous',
      userPhoto: userProfile?.photoURL || user.photoURL || undefined,
      content: replyContent.trim(),
      parentId,
    });

    setReplyContent('');
    setReplyingTo(null);
    toast({
      title: "Reply added",
      description: "Your reply has been added successfully",
    });
  };

  const handleEditComment = (commentId: string, content: string) => {
    setEditingComment(commentId);
    setEditContent(content);
  };

  const handleUpdateComment = (commentId: string) => {
    if (!editContent.trim()) return;

    updateComment(commentId, editContent.trim());
    setEditingComment(null);
    setEditContent('');
    toast({
      title: "Comment updated",
      description: "Your comment has been updated successfully",
    });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
    toast({
      title: "Comment deleted",
      description: "Comment has been deleted successfully",
    });
  };

  const renderComment = (comment: ExpenseComment & { replies?: ExpenseComment[] }, isReply = false) => {
    const isOwner = user?.uid === comment.userId;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}>
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.userPhoto} />
                  <AvatarFallback>
                    {comment.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    {comment.isEdited && (
                      <Badge variant="secondary" className="text-xs">
                        edited
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {editingComment === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px]"
                        placeholder="Edit your comment..."
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateComment(comment.id)}>
                          Save
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setEditingComment(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                  )}
                  
                  {editingComment !== comment.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(comment.id)}
                      className="text-xs text-blue-600 h-6 px-2"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>
              </div>

              {isOwner && editingComment !== comment.id && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white z-50">
                    <DropdownMenuItem onClick={() => handleEditComment(comment.id, comment.content)}>
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteComment(comment.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 ml-11 space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleReply(comment.id)}>
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Render replies */}
        {comment.replies && comment.replies.map(reply => renderComment(reply, true))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments for "{expense.description}"
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[60vh]">
          {/* Comments List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">No comments yet</h3>
                <p className="text-sm text-muted-foreground">
                  Be the first to add a comment about this expense!
                </p>
              </div>
            ) : (
              comments.map(comment => renderComment(comment))
            )}
          </div>

          {/* Add Comment */}
          <div className="border-t pt-4 mt-4">
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="min-h-[80px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleAddComment();
                  }
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Press Cmd/Ctrl + Enter to send
                </span>
                <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Add Comment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};