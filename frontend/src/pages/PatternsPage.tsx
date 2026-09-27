import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchPatterns } from '../services/api';
import { TrendBadge } from '../components/ui/Badge';
import { Activity, MapPin, Search, ChevronRight, Network } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { PatternCluster } from '../types';
import { ErrorState, EmptyState } from '../components/ui/Toast';

function buildPatternGraph(pattern: PatternCluster) {
  const nodes: Node[] = [
    {
      id: 'center',
      data: { label: pattern.label },
      position: { x: 250, y: 150 },
      style: {
        background: 'var(--color-text-primary)',
        border: '2px solid var(--color-text-secondary)',
        borderRadius: 10,
        padding: '10px 16px',
        fontWeight: 700,
        color: '#FFFFFF',
        fontSize: '12px',
        maxWidth: '180px',
      },
    },
    {
      id: 'hazard',
      data: { label: pattern.hazard_type },
      position: { x: 250, y: 30 },
      style: {
        background: 'var(--color-critical-bg)',
        border: '1px solid var(--color-critical-border)',
        borderRadius: 8,
        padding: '6px 14px',
        color: 'var(--color-critical)',
        fontSize: '11px',
        fontWeight: 600,
      },
    },
  ];

  const edges: Edge[] = [
    {
      id: 'e1',
      source: 'hazard',
      target: 'center',
      animated: true,
      style: { stroke: 'var(--color-critical)', strokeWidth: 1.5 },
    },
  ];

  pattern.facilities.slice(0, 4).forEach((fac, i) => {
    const total = Math.min(pattern.facilities.length, 4);
    const spread = total === 1 ? 0 : 200;
    const xOffset = total === 1 ? 0 : (i - (total - 1) / 2) * spread;
    nodes.push({
      id: `fac-${i}`,
      data: { label: fac },
      position: { x: 250 + xOffset, y: 290 },
      style: {
        background: 'var(--color-info-bg)',
        border: '1px solid var(--color-info-border)',
        borderRadius: 8,
        padding: '6px 12px',
        color: 'var(--color-info)',
        fontSize: '11px',
      },
    });
    edges.push({
      id: `e-fac-${i}`,
      source: 'center',
      target: `fac-${i}`,
      style: { stroke: 'var(--color-info)', strokeWidth: 1.2, opacity: 0.6 },
    });
  });

  return { nodes, edges };
}

export function PatternsPage() {
  const [selectedPattern, setSelectedPattern] = useState<PatternCluster | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patterns'],
    queryFn: fetchPatterns,
  });

  if (isLoading) return (
    <div className="flex h-full animate-skeleton">
      <div className="flex flex-col bg-white border-r border-[var(--color-border)] h-full" style={{ width: 300, flexShrink: 0 }}>
        <div className="px-5 py-5 border-b border-[var(--color-border)] h-[130px] bg-[var(--color-surface)]" />
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white border border-[var(--color-border)] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="flex-1 bg-[var(--color-surface)] flex items-center justify-center">
        <div className="w-64 h-64 border border-[var(--color-border)] bg-white rounded-3xl" />
      </div>
    </div>
  );
  if (isError || !data) return <ErrorState message="Failed to load patterns" />;

  const patterns = (data as any)?.patterns || (Array.isArray(data) ? data : []);
  const filteredPatterns = patterns.filter(
    (p: PatternCluster) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.hazard_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* ── Left Panel ──────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col bg-white border-r border-[var(--color-border)] h-full"
        style={{ width: 300, flexShrink: 0 }}
      >
        {/* Panel header */}
        <div className="px-5 py-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-1">
            <Network className="w-4 h-4 text-[var(--color-orange-brand)]" />
            <h2 className="font-bold text-[var(--color-text-primary)] text-[14px]">Pattern Intelligence</h2>
          </div>
          <p className="text-[11px] text-[var(--color-text-tertiary)]">
            AI-clustered incident trends and causal chains
          </p>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patterns…"
              className="pl-9 pr-4 py-2 text-[12px] border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-orange-brand)] w-full text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] transition-colors"
            />
          </div>
        </div>

        {/* Pattern list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredPatterns.length === 0 ? (
            <EmptyState title="No patterns found" description="Try adjusting your search" />
          ) : (
            filteredPatterns.map((pattern: PatternCluster) => (
              <div
                key={pattern.id}
                onClick={() => setSelectedPattern(pattern)}
                className={clsx(
                  'p-4 rounded-xl border cursor-pointer transition-all',
                  selectedPattern?.id === pattern.id
                    ? 'border-[var(--color-orange-brand)]/40 bg-[var(--color-orange-light)]'
                    : 'border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]'
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3
                    className={clsx(
                      'font-semibold text-[12.5px] line-clamp-2 pr-2 leading-snug',
                      selectedPattern?.id === pattern.id
                        ? 'text-[var(--color-orange-brand)]'
                        : 'text-[var(--color-text-primary)]'
                    )}
                  >
                    {pattern.label}
                  </h3>
                  <TrendBadge trend={pattern.trend as any} />
                </div>

                <div className="flex items-center gap-2 text-[10.5px] text-[var(--color-text-tertiary)] mb-2">
                  <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded-lg font-medium">
                    {pattern.count} incidents
                  </span>
                  <span className="bg-[var(--color-surface)] border border-[var(--color-border)] px-2 py-0.5 rounded-lg font-medium">
                    Avg SIF {pattern.avg_sif_score}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-[10.5px] text-[var(--color-text-tertiary)] truncate flex-1">
                    {pattern.hazard_type}
                  </div>
                  <ChevronRight
                    className={clsx(
                      'w-3.5 h-3.5 flex-shrink-0 ml-2',
                      selectedPattern?.id === pattern.id
                        ? 'text-[var(--color-orange-brand)]'
                        : 'text-[var(--color-border-strong)]'
                    )}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--color-border)] text-[10.5px] text-[var(--color-text-tertiary)]">
          {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? 's' : ''} detected
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!selectedPattern ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8" style={{ background: 'var(--color-surface)' }}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white border border-[var(--color-border)] flex items-center justify-center mx-auto mb-5 shadow-sm">
                <Network className="w-8 h-8 text-[var(--color-border-strong)]" />
              </div>
              <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-2">
                Select a Pattern
              </h3>
              <p className="text-[12px] text-[var(--color-text-secondary)] max-w-xs">
                Choose a detected pattern from the sidebar to explore its relationship graph, causal chain, and linked incidents.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Pattern detail header */}
            <div className="px-7 py-5 bg-white border-b border-[var(--color-border)] flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--color-critical-bg)' }}
                    >
                      <Activity className="w-4 h-4" style={{ color: 'var(--color-critical)' }} />
                    </div>
                    <h1 className="text-[16px] font-bold text-[var(--color-text-primary)] leading-tight truncate">
                      {selectedPattern.label}
                    </h1>
                    <TrendBadge trend={selectedPattern.trend as any} />
                  </div>
                  <div className="flex items-center gap-4 text-[11.5px] text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Hazard: <strong className="text-[var(--color-text-primary)]">{selectedPattern.hazard_type}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Sites: <strong className="text-[var(--color-text-primary)]">{selectedPattern.facility_count}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold" style={{ color: 'var(--color-critical)' }}>
                    {selectedPattern.count}
                  </div>
                  <div className="text-[10.5px] text-[var(--color-text-tertiary)] font-medium">Total Occurrences</div>
                </div>
              </div>
            </div>

            {/* Flow graph + incidents panel */}
            <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--color-surface)' }}>
              {(() => {
                const { nodes, edges } = buildPatternGraph(selectedPattern);
                return (
                  <ReactFlow nodes={nodes} edges={edges} fitView>
                    <Background color="var(--color-border)" gap={24} />
                    <Controls />
                  </ReactFlow>
                );
              })()}

              {/* Related Incidents Panel */}
              <div className="absolute right-5 top-5 bottom-5 w-64 bg-white/95 backdrop-blur-sm border border-[var(--color-border)] rounded-xl flex flex-col overflow-hidden shadow-lg">
                <div className="px-4 py-4 border-b border-[var(--color-border)]">
                  <h3 className="font-bold text-[var(--color-text-primary)] text-[13px]">Related Incidents</h3>
                  <p className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">
                    {selectedPattern.incident_ids.length} incidents in this cluster
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                  {selectedPattern.incident_ids.slice(0, 20).map((id) => (
                    <Link
                      key={id}
                      to={`/incidents/${id}`}
                      className="flex items-center justify-between p-3 bg-[var(--color-surface)] hover:bg-[var(--color-orange-light)] border border-[var(--color-border)] hover:border-[var(--color-orange-brand)]/30 rounded-xl text-[11.5px] transition-all group"
                    >
                      <div>
                        <div className="font-mono text-[var(--color-text-primary)] text-[10px] group-hover:text-[var(--color-orange-brand)]">
                          {id}
                        </div>
                        <div className="text-[var(--color-text-tertiary)] text-[10px] mt-0.5">View details →</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[var(--color-border-strong)] group-hover:text-[var(--color-orange-brand)] transition-colors" />
                    </Link>
                  ))}
                  {selectedPattern.incident_ids.length === 0 && (
                    <EmptyState title="No related incidents" />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
