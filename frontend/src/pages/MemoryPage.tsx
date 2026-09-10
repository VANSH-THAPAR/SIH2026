import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Brain } from 'lucide-react';
import { semanticSearch, keywordSearch } from '@/services/api';
import { PageLoading, ErrorState, Card, EmptyState } from '@/components/ui/Toast';
import { PriorityBadge, SIFBadge } from '@/components/ui/Badge';
import { useNavigate } from 'react-router-dom';

export function MemoryPage() {
 const navigate = useNavigate();
 const [query, setQuery] = useState('');
 const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
 const [hasSearched, setHasSearched] = useState(false);

 const { data: results, isLoading, error, refetch } = useQuery<any>({
 queryKey: ['search', searchMode, query],
 queryFn: () => searchMode === 'semantic' ? semanticSearch(query) : keywordSearch(query),
 enabled: hasSearched && query.length > 2,
 staleTime: 30000,
 });

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 if (query.length > 2) {
 setHasSearched(true);
 refetch();
 }
 };

 const resultsArray: any[] = (results as any)?.items || (results as any) || [];

 return (
 <div className="flex flex-col h-full p-6 max-w-screen-xl mx-auto">
 <div className="mb-6 text-center pt-8">
 <div className="w-12 h-12 bg-soft-cloud text-ink rounded-full flex items-center justify-center mx-auto mb-4">
 <Brain size={24} />
 </div>
 <h1 className="text-2xl font-bold text-ink mb-2">Safety Memory</h1>
 <p className="text-sm text-mute max-w-lg mx-auto">
 Search the historical incident database using natural language to find similar precursors, hazards, or situations.
 </p>
 </div>

 <div className="bg-canvas p-6 rounded-none border border-hairline mb-8 max-w-2xl mx-auto w-full">
 <form onSubmit={handleSearch} className="flex gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" size={18} />
 <input
 type="text"
 value={query}
 onChange={e => setQuery(e.target.value)}
 placeholder="e.g. 'worker slipped on oily surface near pump'"
 className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-none focus:ring-2 focus:ring-ink focus:border-transparent outline-none"
 />
 </div>
 <button 
 type="submit" 
 disabled={query.length <= 2 || isLoading}
 className="bg-ink text-canvas px-6 py-3 rounded-none font-medium hover:bg-ink disabled:opacity-50 transition-colors"
 >
 {isLoading ? 'Searching...' : 'Search'}
 </button>
 </form>
 
 <div className="mt-4 flex items-center gap-4 text-sm text-mute justify-center">
 <label className="flex items-center gap-1.5 cursor-pointer">
 <input 
 type="radio" 
 checked={searchMode === 'semantic'} 
 onChange={() => { setSearchMode('semantic'); setHasSearched(false); }} 
 className="text-ink focus:ring-ink"
 />
 Semantic (AI Match)
 </label>
 <label className="flex items-center gap-1.5 cursor-pointer">
 <input 
 type="radio" 
 checked={searchMode === 'keyword'} 
 onChange={() => { setSearchMode('keyword'); setHasSearched(false); }}
 className="text-ink focus:ring-ink" 
 />
 Keyword Match
 </label>
 </div>
 </div>

 <div className="flex-1 overflow-auto max-w-3xl mx-auto w-full">
 {hasSearched && isLoading && <PageLoading />}
 
 {hasSearched && error && <ErrorState message="Search failed" />}
 
 {hasSearched && !isLoading && !error && resultsArray.length === 0 && (
 <EmptyState title="No similar incidents found" description="Try rephrasing your search query" />
 )}

 {hasSearched && !isLoading && !error && resultsArray.length > 0 && (
 <div className="space-y-4">
 <div className="text-sm font-medium text-mute border-b border-hairline pb-2">
 Found {resultsArray.length} results
 </div>
 
 {resultsArray.map((incident: any) => (
 <Card 
 key={incident.id} 
 className="p-4 cursor-pointer hover:border-zinc-300"
 onClick={() => navigate(`/incidents/${incident.id}`)}
 >
 <div className="flex justify-between items-start mb-2">
 <div className="flex items-center gap-2">
 <span className="text-xs font-mono text-mute">{incident.id}</span>
 {searchMode === 'semantic' && incident.similarity_score !== undefined && (
 <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
 {Math.round(incident.similarity_score * 100)}% Match
 </span>
 )}
 </div>
 <div className="flex gap-2">
 <PriorityBadge priority={incident.priority} />
 <SIFBadge score={incident.sif_score} classification={incident.sif_classification} />
 </div>
 </div>
 
 <h3 className="font-medium text-ink mb-2">{incident.title}</h3>
 
 <div className="text-sm text-mute mb-3 line-clamp-2">
 {incident.hazard || 'No hazard description available.'}
 </div>
 
 <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
 {incident.site_name && <span>📍 {incident.site_name}</span>}
 {incident.report_date && <span>📅 {incident.report_date}</span>}
 {incident.activity && <span>⚙ {incident.activity}</span>}
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
