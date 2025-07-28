import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ExpenseComment {
  id: string;
  expenseId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  parentId?: string; // For threaded comments
  isEdited: boolean;
}

interface CommentStore {
  comments: ExpenseComment[];
  addComment: (comment: Omit<ExpenseComment, 'id' | 'createdAt' | 'isEdited'>) => void;
  updateComment: (id: string, content: string) => void;
  deleteComment: (id: string) => void;
  getExpenseComments: (expenseId: string) => ExpenseComment[];
  getThreadedComments: (expenseId: string) => ExpenseComment[];
  replyToComment: (comment: Omit<ExpenseComment, 'id' | 'createdAt' | 'isEdited'>) => void;
}

export const useCommentStore = create<CommentStore>()(
  persist(
    (set, get) => ({
      comments: [],

      addComment: (commentData) => {
        const newComment: ExpenseComment = {
          ...commentData,
          id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date(),
          isEdited: false,
        };
        set((state) => ({
          comments: [...state.comments, newComment],
        }));
      },

      updateComment: (id, content) => {
        set((state) => ({
          comments: state.comments.map((comment) =>
            comment.id === id 
              ? { ...comment, content, updatedAt: new Date(), isEdited: true }
              : comment
          ),
        }));
      },

      deleteComment: (id) => {
        set((state) => ({
          comments: state.comments.filter((comment) => comment.id !== id),
        }));
      },

      getExpenseComments: (expenseId) => {
        return get().comments
          .filter((comment) => comment.expenseId === expenseId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      },

      getThreadedComments: (expenseId) => {
        const allComments = get().getExpenseComments(expenseId);
        const rootComments = allComments.filter(comment => !comment.parentId);
        
        const buildThread = (parentComment: ExpenseComment): ExpenseComment & { replies: ExpenseComment[] } => {
          const replies = allComments.filter(comment => comment.parentId === parentComment.id);
          return {
            ...parentComment,
            replies: replies.map(reply => buildThread(reply)) as ExpenseComment[],
          };
        };

        return rootComments.map(comment => buildThread(comment));
      },

      replyToComment: (commentData) => {
        get().addComment(commentData);
      },
    }),
    {
      name: 'comment-storage',
      partialize: (state) => ({ comments: state.comments }),
    }
  )
);