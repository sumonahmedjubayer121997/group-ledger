
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { CheckSquare, Plus, Edit, Trash2, Save, X, User, Calendar } from 'lucide-react';
import { 
  GroupTask, 
  createTask, 
  updateTask, 
  deleteTask,
  subscribeToGroupTasks 
} from '@/services/groupCommunicationService';
import { Member } from '@/stores/expenseStore';

interface GroupTasksProps {
  groupId: string;
  members: Member[];
}

export const GroupTasks: React.FC<GroupTasksProps> = ({ groupId, members }) => {
  const [tasks, setTasks] = useState<GroupTask[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const { user, userProfile } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!groupId) return;
    
    const unsubscribe = subscribeToGroupTasks(groupId, (updatedTasks) => {
      setTasks(updatedTasks);
    });

    return unsubscribe;
  }, [groupId]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      assignedTo: '',
      dueDate: '',
    });
  };

  const handleCreateTask = async () => {
    if (!formData.title.trim() || !user || !userProfile || loading) return;

    setLoading(true);
    try {
      const assignedMember = members.find(m => m.id === formData.assignedTo);
      const taskData = {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo && formData.assignedTo !== 'unassigned' ? formData.assignedTo : undefined,
        assignedToName: assignedMember?.name || undefined,
        createdBy: user.uid,
        createdByName: userProfile.name,
        completed: false,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      };

      await createTask(groupId, taskData);
      resetForm();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string) => {
    if (!formData.title.trim() || loading) return;

    setLoading(true);
    try {
      const assignedMember = members.find(m => m.id === formData.assignedTo);
      const updates = {
        title: formData.title,
        description: formData.description,
        assignedTo: formData.assignedTo || undefined,
        assignedToName: assignedMember?.name || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
      };

      await updateTask(groupId, taskId, updates);
      resetForm();
      setEditingTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      await updateTask(groupId, taskId, { completed });
    } catch (error) {
      console.error('Error updating task completion:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (loading) return;

    setLoading(true);
    try {
      await deleteTask(groupId, taskId);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (task: GroupTask) => {
    setEditingTask(task.id);
    setFormData({
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo || '',
      dueDate: task.dueDate ? format(task.dueDate, 'yyyy-MM-dd') : '',
    });
  };

  const cancelEditing = () => {
    setEditingTask(null);
    resetForm();
  };

  const TaskForm = ({ onSubmit, onCancel, submitLabel }: {
    onSubmit: () => void;
    onCancel: () => void;
    submitLabel: string;
  }) => (
    <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
      <Input
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Task title"
        className="w-full"
      />
      <Textarea
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Task description (optional)"
        className="min-h-[80px]"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Select value={formData.assignedTo} onValueChange={(value) => setFormData({ ...formData, assignedTo: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Assign to member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">No assignment</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          placeholder="Due date"
        />
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={!formData.title.trim() || loading}
          size={isMobile ? "sm" : "default"}
        >
          <Save className="w-4 h-4 mr-1" />
          {submitLabel}
        </Button>
        <Button
          variant="outline"
          onClick={onCancel}
          size={isMobile ? "sm" : "default"}
        >
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="h-full">
      <CardHeader className={`${isMobile ? 'p-3' : 'p-4'} border-b`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} flex items-center gap-2`}>
            <CheckSquare className="w-5 h-5" />
            Tasks
          </CardTitle>
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className={`${isMobile ? 'p-3' : 'p-4'} space-y-4`}>
        {showAddForm && (
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => {
              setShowAddForm(false);
              resetForm();
            }}
            submitLabel="Create Task"
          />
        )}

        {tasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <CheckSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks yet.</p>
            <p className="text-sm">Create your first task to get organized!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className={`p-4 rounded-lg border ${
                task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}>
                {editingTask === task.id ? (
                  <TaskForm
                    onSubmit={() => handleUpdateTask(task.id)}
                    onCancel={cancelEditing}
                    submitLabel="Update Task"
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          checked={task.completed}
                          onCheckedChange={(checked) => handleToggleComplete(task.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <h3 className={`font-medium ${task.completed ? 'line-through text-gray-500' : ''}`}>
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className={`text-sm text-gray-600 mt-1 ${task.completed ? 'line-through' : ''}`}>
                              {task.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(task)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Created by {task.createdByName}
                      </div>
                      {task.assignedToName && (
                        <Badge variant="outline" className="text-xs">
                          Assigned to {task.assignedToName}
                        </Badge>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due {format(task.dueDate, 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
