
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { Pin, Edit, Trash2, Plus, Save, X } from 'lucide-react';
import { 
  PinnedNote, 
  createPinnedNote, 
  updatePinnedNote, 
  deletePinnedNote,
  subscribeToGroupNotes 
} from '@/services/groupCommunicationService';

interface GroupPinnedNotesProps {
  groupId: string;
  isAdmin: boolean;
}

export const GroupPinnedNotes: React.FC<GroupPinnedNotesProps> = ({ groupId, isAdmin }) => {
  const [notes, setNotes] = useState<PinnedNote[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!groupId) return;
    
    const unsubscribe = subscribeToGroupNotes(groupId, (updatedNotes) => {
      setNotes(updatedNotes);
    });

    return unsubscribe;
  }, [groupId]);

  const handleCreateNote = async () => {
    if (!newNoteContent.trim() || !user || !userProfile || loading) return;

    setLoading(true);
    try {
      await createPinnedNote(groupId, newNoteContent, user.uid, userProfile.name);
      setNewNoteContent('');
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!editContent.trim() || loading) return;

    setLoading(true);
    try {
      await updatePinnedNote(groupId, noteId, editContent);
      setEditingNote(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating note:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      await deletePinnedNote(groupId, noteId);
    } catch (error) {
      console.error('Error deleting note:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (note: PinnedNote) => {
    setEditingNote(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditContent('');
  };

  return (
    <Card className="h-full">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <Pin className="w-5 h-5" />
            Pinned Notes
          </CardTitle>
          {isAdmin && (
            <Button
              variant="outline"
              size={isMobile ? "sm" : "default"}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'} space-y-4`}>
        {showAddForm && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Enter your note here..."
              className="min-h-[100px]"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreateNote}
                disabled={!newNoteContent.trim() || loading}
                size={isMobile ? "sm" : "default"}
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewNoteContent('');
                }}
                size={isMobile ? "sm" : "default"}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Pin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No pinned notes yet.</p>
            {isAdmin && <p className="text-sm">Add your first note to keep important information visible.</p>}
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              {editingNote === note.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleUpdateNote(note.id)}
                      disabled={!editContent.trim() || loading}
                      size={isMobile ? "sm" : "default"}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      size={isMobile ? "sm" : "default"}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm text-gray-600">
                      By {note.createdByName} • {format(note.createdAt, 'MMM d, yyyy')}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(note)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap text-gray-800">
                    {note.content}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
