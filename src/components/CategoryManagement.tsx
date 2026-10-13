import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { doneWithUndo } from '@/lib/undo';
import { Plus, Trash2, Edit, Tag, Palette } from 'lucide-react';
import { useCategoryStore } from '@/stores/categoryStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CategoryManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const colorOptions = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#000000'
];

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { 
    categories, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    getUserCategories,
    initializeDefaultCategories 
  } = useCategoryStore();

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(colorOptions[0]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  React.useEffect(() => {
    if (user?.uid) {
      initializeDefaultCategories(user.uid);
    }
  }, [user?.uid, initializeDefaultCategories]);

  const userCategories = user ? getUserCategories(user.uid) : [];

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !user) return;

    // Check if category already exists
    const exists = userCategories.some(
      cat => cat.name.toLowerCase() === newCategoryName.trim().toLowerCase()
    );

    if (exists) {
      toast({
        title: "Category exists",
        description: "A category with this name already exists",
        variant: "destructive",
      });
      return;
    }

    addCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
      userId: user.uid,
      isDefault: false,
    });

    setNewCategoryName('');
    setNewCategoryColor(colorOptions[0]);
    
    toast({
      title: "Category added",
    });
  };

  const handleEditCategory = (categoryId: string) => {
    const category = userCategories.find(cat => cat.id === categoryId);
    if (category) {
      setEditingCategory(categoryId);
      setEditName(category.name);
      setEditColor(category.color || colorOptions[0]);
    }
  };

  const handleUpdateCategory = () => {
    if (!editName.trim() || !editingCategory) return;

    updateCategory(editingCategory, {
      name: editName.trim(),
      color: editColor,
    });

    setEditingCategory(null);
    setEditName('');
    setEditColor('');
    
    toast({
      title: "Category renamed",
    });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const removed = useCategoryStore.getState().categories.find((c) => c.id === categoryId);
    deleteCategory(categoryId);
    if (removed) {
      doneWithUndo({
        title: `Deleted "${removed.name}"`,
        description: "Expenses keep their category name.",
        undo: () => useCategoryStore.setState((state) => ({ categories: [...state.categories, removed] })),
      });
    }
  };

  const customCategories = userCategories.filter(cat => !cat.isDefault);
  const defaultCategories = userCategories.filter(cat => cat.isDefault);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Manage categories
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="categoryName">Category name</Label>
                <Input
                  id="categoryName"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter category name"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                />
              </div>
              
              <div>
                <Label>Color</Label>
                <div className="flex gap-2 mt-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCategoryColor(color)}
                      aria-label={`Colour ${color}`}
                      aria-pressed={newCategoryColor === color}
                      className={`w-8 h-8 rounded-full border-2 ${
 newCategoryColor === color ? 'border-foreground ring-2 ring-ring ring-offset-2' : 'border-border'
 }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <Button onClick={handleAddCategory} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add category
              </Button>
            </CardContent>
          </Card>

          {/* Custom Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Custom Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {customCategories.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No custom categories yet. Add one above to get started!
                </p>
              ) : (
                <div className="space-y-2">
                  {customCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color || '#64748b' }}
                        />
                        {editingCategory === category.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-40"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateCategory();
                                if (e.key === 'Escape') setEditingCategory(null);
                              }}
                            />
                            <div className="flex gap-1">
                              {colorOptions.map((color) => (
                                <button
                                  key={color}
                                  onClick={() => setEditColor(color)}
                                  className={`w-6 h-6 rounded-full border ${
 editColor === color ? 'border-border' : 'border-border'
 }`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="font-medium">{category.name}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {editingCategory === category.id ? (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleUpdateCategory}>
                              Save
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setEditingCategory(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditCategory(category.id)}
                              aria-label={`Rename ${category.name}`}
                            >
                              <Edit className="h-4 w-4" aria-hidden="true" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category.id)} aria-label={`Delete ${category.name}`}>
                              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Default Categories */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {defaultCategories.map((category) => (
                  <Badge key={category.id} variant="outline">
                    {category.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};