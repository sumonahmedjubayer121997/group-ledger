import React, { useState } from 'react';
import { Search, Filter, X, Calendar, DollarSign, Tag, Users, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useSearch, SearchFilters } from '@/hooks/useSearch';
import { useExpenseStore } from '@/stores/expenseStore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SearchAndFilterProps {
  onResultsChange?: (results: any) => void;
}

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({ onResultsChange }) => {
  const { expenses, groups } = useExpenseStore();
  const [showFilters, setShowFilters] = useState(false);
  
  // Get all unique members from all groups
  const allMembers = React.useMemo(() => {
    const membersSet = new Set();
    const members: any[] = [];
    groups.forEach(group => {
      group.members.forEach(member => {
        if (!membersSet.has(member.id)) {
          membersSet.add(member.id);
          members.push(member);
        }
      });
    });
    return members;
  }, [groups]);

  // Get all unique categories
  const allCategories = React.useMemo(() => {
    const categoriesSet = new Set(expenses.map(expense => expense.category));
    return Array.from(categoriesSet) as string[];
  }, [expenses]);

  const {
    searchQuery,
    setSearchQuery,
    filters,
    updateFilters,
    clearFilters,
    searchResults,
    hasActiveFilters,
  } = useSearch(expenses, groups, allMembers);

  React.useEffect(() => {
    onResultsChange?.(searchResults);
  }, [searchResults, onResultsChange]);

  const handleDateRangeChange = (field: 'from' | 'to', date: Date | undefined) => {
    updateFilters({
      dateRange: {
        ...filters.dateRange,
        [field]: date || null,
      },
    });
  };

  const handleAmountRangeChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    updateFilters({
      amountRange: {
        ...filters.amountRange,
        [field]: numValue,
      },
    });
  };

  const handleArrayFilterChange = (filterKey: keyof SearchFilters, value: string, checked: boolean) => {
    const currentArray = filters[filterKey] as string[];
    const newArray = checked
      ? [...currentArray, value]
      : currentArray.filter(item => item !== value);
    
    updateFilters({ [filterKey]: newArray });
  };

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    if (filters.amountRange.min !== null || filters.amountRange.max !== null) count++;
    if (filters.categories.length > 0) count++;
    if (filters.paidBy.length > 0) count++;
    if (filters.groups.length > 0) count++;
    if (filters.splitAmong.length > 0) count++;
    return count;
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search expenses, groups, members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSearchQuery('')}
                  />
                </Badge>
              )}
              
              {(filters.dateRange.from || filters.dateRange.to) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {filters.dateRange.from && format(filters.dateRange.from, 'MMM dd')}
                  {filters.dateRange.from && filters.dateRange.to && ' - '}
                  {filters.dateRange.to && format(filters.dateRange.to, 'MMM dd')}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => updateFilters({ dateRange: { from: null, to: null } })}
                  />
                </Badge>
              )}

              {(filters.amountRange.min !== null || filters.amountRange.max !== null) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {filters.amountRange.min !== null && `$${filters.amountRange.min}`}
                  {filters.amountRange.min !== null && filters.amountRange.max !== null && ' - '}
                  {filters.amountRange.max !== null && `$${filters.amountRange.max}`}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => updateFilters({ amountRange: { min: null, max: null } })}
                  />
                </Badge>
              )}

              {filters.categories.map(category => (
                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {category}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => handleArrayFilterChange('categories', category, false)}
                  />
                </Badge>
              ))}

              {filters.groups.map(groupId => {
                const group = groups.find(g => g.id === groupId);
                return group ? (
                  <Badge key={groupId} variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {group.name}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-destructive" 
                      onClick={() => handleArrayFilterChange('groups', groupId, false)}
                    />
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Advanced Filters
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
              </Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateRange.from && "text-muted-foreground"
                      )}
                    >
                      {filters.dateRange.from ? format(filters.dateRange.from, "PPP") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateRange.from || undefined}
                      onSelect={(date) => handleDateRangeChange('from', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !filters.dateRange.to && "text-muted-foreground"
                      )}
                    >
                      {filters.dateRange.to ? format(filters.dateRange.to, "PPP") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filters.dateRange.to || undefined}
                      onSelect={(date) => handleDateRangeChange('to', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Amount Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Amount Range
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min amount"
                  value={filters.amountRange.min || ''}
                  onChange={(e) => handleAmountRangeChange('min', e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max amount"
                  value={filters.amountRange.max || ''}
                  onChange={(e) => handleAmountRangeChange('max', e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Categories */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Categories
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {allCategories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={`category-${category}`}
                      checked={filters.categories.includes(category)}
                      onCheckedChange={(checked) => 
                        handleArrayFilterChange('categories', category, checked as boolean)
                      }
                    />
                    <Label htmlFor={`category-${category}`} className="text-sm">
                      {category}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Groups */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Groups
              </Label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`group-${group.id}`}
                      checked={filters.groups.includes(group.id)}
                      onCheckedChange={(checked) => 
                        handleArrayFilterChange('groups', group.id, checked as boolean)
                      }
                    />
                    <Label htmlFor={`group-${group.id}`} className="text-sm">
                      {group.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Members */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Members
              </Label>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {allMembers.map(member => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`member-${member.id}`}
                      checked={filters.paidBy.includes(member.id) || filters.splitAmong.includes(member.id)}
                      onCheckedChange={(checked) => {
                        handleArrayFilterChange('paidBy', member.id, checked as boolean);
                        handleArrayFilterChange('splitAmong', member.id, checked as boolean);
                      }}
                    />
                    <Label htmlFor={`member-${member.id}`} className="text-sm">
                      {member.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};