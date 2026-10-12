import { useState } from "react";
import { SearchAndFilter } from "@/components/SearchAndFilter";
import { SearchResults } from "@/components/SearchResults";
import { PageHeader } from "@/components/PageHeader";

/** Search across expenses, groups and members. */
export default function SearchPage() {
  const [results, setResults] = useState({
    expenses: [],
    personalExpenses: [],
    groups: [],
    members: [],
  });

  return (
    <>
      <PageHeader title="Search" description="Find expenses, groups and people." />
      <div className="space-y-6">
        <SearchAndFilter onResultsChange={setResults} />
        <SearchResults expenses={results.expenses} groups={results.groups} members={results.members} searchQuery="" />
      </div>
    </>
  );
}
