
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { BarChart3, Plus, Vote, X, Save, Trash2 } from 'lucide-react';
import { 
  GroupPoll, 
  createPoll, 
  votePoll, 
  closePoll,
  subscribeToGroupPolls 
} from '@/services/groupCommunicationService';

interface GroupPollsProps {
  groupId: string;
}

export const GroupPolls: React.FC<GroupPollsProps> = ({ groupId }) => {
  const [polls, setPolls] = useState<GroupPoll[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', ''],
    expiresAt: '',
  });
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!groupId) return;
    
    const unsubscribe = subscribeToGroupPolls(groupId, (updatedPolls) => {
      setPolls(updatedPolls);
    });

    return unsubscribe;
  }, [groupId]);

  const resetForm = () => {
    setNewPoll({
      question: '',
      options: ['', ''],
      expiresAt: '',
    });
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll({
        ...newPoll,
        options: [...newPoll.options, ''],
      });
    }
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll({
        ...newPoll,
        options: newPoll.options.filter((_, i) => i !== index),
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...newPoll.options];
    updatedOptions[index] = value;
    setNewPoll({
      ...newPoll,
      options: updatedOptions,
    });
  };

  const handleCreatePoll = async () => {
    if (!newPoll.question.trim() || !user || !userProfile || loading) return;

    const validOptions = newPoll.options.filter(opt => opt.trim());
    if (validOptions.length < 2) return;

    setLoading(true);
    try {
      const expiresAt = newPoll.expiresAt ? new Date(newPoll.expiresAt) : undefined;
      await createPoll(groupId, newPoll.question, validOptions, user.uid, userProfile.name, expiresAt);
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      await votePoll(groupId, pollId, optionId, user.uid);
    } catch (error) {
      console.error('Error voting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      await closePoll(groupId, pollId);
    } catch (error) {
      console.error('Error closing poll:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalVotes = (poll: GroupPoll) => {
    return poll.options.reduce((total, option) => total + option.votes.length, 0);
  };

  const getUserVote = (poll: GroupPoll) => {
    if (!user) return null;
    return poll.options.find(option => option.votes.includes(user.uid))?.id || null;
  };

  const getVotePercentage = (poll: GroupPoll, optionVotes: number) => {
    const totalVotes = getTotalVotes(poll);
    return totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
  };

  return (
    <Card className="h-full">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <BarChart3 className="w-5 h-5" />
            Polls
          </CardTitle>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Create Poll
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'} space-y-4`}>
        {showAddForm && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
            <Input
              value={newPoll.question}
              onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
              placeholder="Enter your poll question"
              className="w-full"
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Options:</label>
              {newPoll.options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  {newPoll.options.length > 2 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {newPoll.options.length < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
            
            <Input
              type="datetime-local"
              value={newPoll.expiresAt}
              onChange={(e) => setNewPoll({ ...newPoll, expiresAt: e.target.value })}
              placeholder="Expires at (optional)"
            />
            
            <div className="flex gap-2">
              <Button
                onClick={handleCreatePoll}
                disabled={!newPoll.question.trim() || newPoll.options.filter(opt => opt.trim()).length < 2 || loading}
                size={isMobile ? "sm" : "default"}
              >
                <Save className="w-4 h-4 mr-1" />
                Create Poll
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                size={isMobile ? "sm" : "default"}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {polls.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Vote className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No polls yet.</p>
            <p className="text-sm">Create your first poll to gather opinions!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => {
              const totalVotes = getTotalVotes(poll);
              const userVote = getUserVote(poll);
              const isExpired = poll.expiresAt && poll.expiresAt < new Date();
              const canVote = poll.active && !isExpired;

              return (
                <div key={poll.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{poll.question}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>By {poll.createdByName}</span>
                        <span>•</span>
                        <span>{format(poll.createdAt, 'MMM d, yyyy')}</span>
                        {poll.expiresAt && (
                          <>
                            <span>•</span>
                            <span className={isExpired ? 'text-red-500' : ''}>
                              {isExpired ? 'Expired' : `Expires ${format(poll.expiresAt, 'MMM d, yyyy')}`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={canVote ? "default" : "secondary"}>
                        {canVote ? 'Active' : 'Closed'}
                      </Badge>
                      {user && poll.createdBy === user.uid && canVote && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClosePoll(poll.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {poll.options.map((option) => {
                      const percentage = getVotePercentage(poll, option.votes.length);
                      const isSelected = userVote === option.id;

                      return (
                        <div key={option.id} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Button
                              variant={isSelected ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleVote(poll.id, option.id)}
                              disabled={!canVote || loading}
                              className="flex-1 justify-start"
                            >
                              {option.text}
                            </Button>
                            <span className="text-sm text-gray-500 ml-2">
                              {option.votes.length} vote{option.votes.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                          <div className="text-xs text-gray-500 text-right">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-sm text-gray-500">
                    Total votes: {totalVotes}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
