import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Brain, ArrowRight } from 'lucide-react';
import { semanticSearch, keywordSearch } from '../services/api';
import { PriorityBadge, SIFBadge } from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { ErrorState, EmptyState } from '../components/ui/Toast';

export function MemoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');
  const [hasSearched, setHasSearched] = useState(false);

  const { data: results, isLoading, isError, refetch } = useQuery<any>({
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

  const EXAMPLE_QUERIES = [
    'worker slipped near pump during maintenance',
    'failed isolation energized equipment',
    'chemical exposure during loading',
    'scaffolding collapse height work',
  ];

  return (
    <div className="flex flex-col min-h-full p-7 max-w-[1200px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="text-center pt-8 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <Brain className="w-6 h-6" style={{ color: 'var(--color-text-primary)' }} />
        </div>
        <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight mb-2">
          Safety Memory
        </h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] max-w-md mx-auto">
          Search the historical incident database using natural language to find similar precursors, hazards, and situations.
        </p>
      </div>

      {/* ── Search Box ──────────────────────────────────────────────────────── */}
      <div
        className="bg-white p-6 rounded-2xl border border-[var(--color-border)] mb-6 max-w-2xl mx-auto w-full"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}
      >
        <form onSubmit={handleSearch} className="flex gap-2.5 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe an incident or hazard situation…"
              className="w-full pl-10 pr-4 py-3 border border-[var(--color-border)] rounded-xl focus:ring-2 focus:ring-[var(--color-orange-brand)] focus:border-transparent outline-none text-[13px] text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] bg-[var(--color-surface)] focus:bg-white transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={query.length <= 2 || isLoading}
            className="px-6 py-3 rounded-xl font-semibold text-[13px] text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-orange-brand)' }}
          >
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="flex items-center gap-4 text-[12px] text-[var(--color-text-secondary)] justify-center mb-4">
          {(['semantic', 'keyword'] as const).map((mode) => (
            <label key={mode} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={searchMode === mode}
                onChange={() => { setSearchMode(mode); setHasSearched(false); }}
                className="accent-[var(--color-orange-brand)]"
              />
              <span className="font-medium">
                {mode === 'semantic' ? 'Semantic (AI Match)' : 'Keyword Match'}
              </span>
            </label>
          ))}
        </div>

        {/* Example queries */}
        {!hasSearched && (
          <div>
            <div className="text-[10.5px] font-semibold text-[var(--color-text-tertiary)] mb-2.5 uppercase tracking-wide text-center">
              Try an example
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="text-[11.5px] px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[var(--color-orange-brand)]/40 hover:text-[var(--color-orange-brand)] transition-all font-medium"
                >
                  "{q.slice(0, 40)}{q.length > 40 ? '…' : ''}"
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto max-w-2xl mx-auto w-full">
        {hasSearched && isLoading && (
          <div className="space-y-3 animate-skeleton">
            <div className="h-4 w-32 bg-[var(--color-border)] rounded mb-5" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[var(--color-border)] rounded-xl p-5 h-[130px]" />
            ))}
          </div>
        )}
        {hasSearched && isError && <ErrorState message="Search failed — please try again." />}
        {hasSearched && !isLoading && !isError && resultsArray.length === 0 && (
          <EmptyState
            title="No similar incidents found"
            description="Try rephrasing your search or switch between semantic and keyword modes."
          />
        )}

        {hasSearched && !isLoading && !isError && resultsArray.length > 0 && (
          <div>
            <div className="text-[12px] font-semibold text-[var(--color-text-secondary)] border-b border-[var(--color-border)] pb-3 mb-4 flex items-center justify-between">
              <span>
                {resultsArray.length} result{resultsArray.length !== 1 ? 's' : ''}
                {searchMode === 'semantic' ? ' · AI semantic match' : ' · Keyword match'}
              </span>
            </div>

            <div className="space-y-3">
              {resultsArray.map((incident: any) => (
                <div
                  key={incident.id}
                  className="bg-white border border-[var(--color-border)] rounded-xl p-5 cursor-pointer hover:border-[var(--color-border-strong)] hover:shadow-sm transition-all group"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                        {incident.id}
                      </span>
                      {searchMode === 'semantic' && incident.similarity_score != null && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-lg"
                          style={{
                            background: 'var(--color-orange-light)',
                            color: 'var(--color-orange-brand)',
                          }}
                        >
                          {Math.round(incident.similarity_score * 100)}% match
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <PriorityBadge priority={incident.priority} size="xs" />
                      <SIFBadge score={incident.sif_score} classification={incident.sif_classification} />
                    </div>
                  </div>

                  <h3 className="font-semibold text-[var(--color-text-primary)] mb-2 text-[13px] group-hover:text-[var(--color-orange-brand)] transition-colors">
                    {incident.title}
                  </h3>

                  {incident.hazard && (
                    <p className="text-[12px] text-[var(--color-text-secondary)] mb-3 line-clamp-2">
                      {incident.hazard}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border)] pt-2.5">
                    {incident.site_name && <span>📍 {incident.site_name}</span>}
                    {incident.report_date && <span>📅 {incident.report_date}</span>}
                    {incident.activity && <span>⚙ {incident.activity}</span>}
                    <span className="ml-auto flex items-center gap-1 text-[var(--color-orange-brand)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      View incident <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
