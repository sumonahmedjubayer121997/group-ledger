import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SearchAndFilter } from '@/components/SearchAndFilter';
import { SearchResults } from '@/components/SearchResults';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from './AuthPage';

interface SearchPageProps {
  onBack: () => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [searchResults, setSearchResults] = useState({
    expenses: [],
    groups: [],
    members: [],
  });
  const [searchQuery, setSearchQuery] = useState('');

  if (!user) {
    return <AuthPage onBack={onBack} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Search & Filter</h1>
            <p className="text-gray-600">Find expenses, groups, and members</p>
          </div>
        </div>

        {/* Search and Filter Component */}
        <div className="space-y-6">
          <SearchAndFilter 
            onResultsChange={(results) => {
              setSearchResults(results);
              // You could also track the search query here if needed
            }}
          />

          {/* Search Results */}
          <SearchResults
            expenses={searchResults.expenses}
            groups={searchResults.groups}
            members={searchResults.members}
            searchQuery={searchQuery}
          />
        </div>
      </div>
    </div>
  );
};