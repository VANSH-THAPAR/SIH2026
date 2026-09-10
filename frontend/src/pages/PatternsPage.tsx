import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchPatterns } from '@/services/api';
import { TrendBadge } from '@/components/ui/Badge';
import { GitBranch, Activity, MapPin, Search, ChevronRight, Calendar, Download, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { PatternCluster } from '@/types';

function buildPatternGraph(pattern: PatternCluster) {
  const nodes: Node[] = [
    {
      id: 'center',
      data: { label: pattern.label },
      position: { x: 250, y: 150 },
      style: {
        background: '#1E293B',
        border: '2px solid #334155',
        borderRadius: '12px',
        padding: '12px 16px',
        fontWeight: 'bold',
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
        background: '#FEF2F2',
        border: '1px solid #FCA5A5',
        borderRadius: '10px',
        padding: '8px 14px',
        color: '#991B1B',
        fontSize: '11px',
        fontWeight: '600',
      },
    },
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'hazard', target: 'center', animated: true, style: { stroke: '#EF4444', strokeWidth: 2 } },
  ];

  pattern.facilities.slice(0, 3).forEach((fac, i) => {
    const xOffset = (i - 1) * 200;
    nodes.push({
      id: `fac-${i}`,
      data: { label: fac },
      position: { x: 250 + xOffset, y: 270 },
      style: {
        background: '#F0F9FF',
        border: '1px solid #BAE6FD',
        borderRadius: '10px',
        padding: '6px 12px',
        color: '#0369A1',
        fontSize: '11px',
      },
    });
    edges.push({
      id: `e-fac-${i}`,
      source: 'center',
      target: `fac-${i}`,
      style: { stroke: '#93C5FD', strokeWidth: 1.5 },
    });
  });

  return { nodes, edges };
}

export function PatternsPage() {
  const [selectedPattern, setSelectedPattern] = useState<PatternCluster | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['patterns'],
    queryFn: () => fetchPatterns(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        Failed to load patterns
      </div>
    );
  }

  const patterns = (data as any)?.patterns || (Array.isArray(data) ? data : []);
  const filteredPatterns = patterns.filter(
    (p: PatternCluster) =>
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.hazard_type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full bg-[#F4F5F9]">
      {/* ─── Left Sidebar Panel ─────────────────────────────────────────────── */}
      <div
        className="flex flex-col bg-white border-r border-slate-100 h-full"
        style={{ width: 320, flexShrink: 0 }}
      >
        {/* Sidebar header */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-[15px]">Detected Patterns</h2>
          </div>
          <p className="text-xs text-slate-400">AI-clustered incident trends and causal chains</p>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patterns..."
              className="pl-9 pr-4 py-2 text-[12px] border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-full transition-colors"
            />
          </div>
        </div>

        {/* Pattern list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredPatterns.map((pattern: PatternCluster) => (
            <div
              key={pattern.id}
              onClick={() => setSelectedPattern(pattern)}
              className={clsx(
                'p-4 rounded-xl border cursor-pointer transition-all',
                selectedPattern?.id === pattern.id
                  ? 'border-blue-300 bg-blue-50 shadow-[0_2px_8px_rgba(37,99,235,0.12)]'
                  : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <h3
                  className={clsx(
                    'font-semibold text-[13px] line-clamp-2 pr-2 leading-snug',
                    selectedPattern?.id === pattern.id ? 'text-blue-800' : 'text-slate-800'
                  )}
                >
                  {pattern.label}
                </h3>
                <TrendBadge trend={pattern.trend as any} />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
                <span className="bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                  {pattern.count} incidents
                </span>
                <span className="bg-slate-100 px-2 py-0.5 rounded-lg font-medium">
                  Avg SIF: {pattern.avg_sif_score}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[11px] text-slate-400 truncate flex-1">{pattern.hazard_type}</div>
                <ChevronRight
                  className={clsx(
                    'w-3.5 h-3.5 flex-shrink-0 ml-2',
                    selectedPattern?.id === pattern.id ? 'text-blue-500' : 'text-slate-300'
                  )}
                />
              </div>
            </div>
          ))}

          {filteredPatterns.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400">
              <GitBranch className="w-8 h-8 mx-auto mb-3 text-slate-200" />
              No patterns found
            </div>
          )}
        </div>

        {/* Pattern count footer */}
        <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-400">
          {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? 's' : ''} detected
        </div>
      </div>

      {/* ─── Main content area ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {!selectedPattern ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#F4F5F9] p-8">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto mb-5 shadow-sm">
                <GitBranch className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-base font-bold text-slate-700 mb-2">Select a Pattern</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                Choose a detected pattern from the sidebar to explore its relationships, causal chain, and related incidents.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Pattern detail header */}
            <div className="px-7 py-5 bg-white border-b border-slate-100 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4 text-rose-600" />
                    </div>
                    <h1 className="text-[17px] font-bold text-slate-900 leading-tight truncate">
                      {selectedPattern.label}
                    </h1>
                    <TrendBadge trend={selectedPattern.trend as any} />
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" />
                      Hazard: <strong className="text-slate-700">{selectedPattern.hazard_type}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Sites Affected: <strong className="text-slate-700">{selectedPattern.facility_count}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-3xl font-bold text-rose-600 mb-1">{selectedPattern.count}</div>
                  <div className="text-[11px] text-slate-400 font-medium">Total Occurrences</div>
                </div>
              </div>
            </div>

            {/* Flow graph + incidents panel */}
            <div className="flex-1 relative overflow-hidden">
              {(() => {
                const { nodes, edges } = buildPatternGraph(selectedPattern);
                return (
                  <ReactFlow nodes={nodes} edges={edges} fitView attributionPosition="bottom-right">
                    <Background color="#E2E8F0" gap={20} />
                    <Controls className="!shadow-sm !border-slate-200" />
                  </ReactFlow>
                );
              })()}

              {/* Related Incidents Panel */}
              <div className="absolute right-5 top-5 bottom-5 w-72 bg-white/95 backdrop-blur-sm border border-slate-200/80 rounded-2xl flex flex-col overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-[13px]">Related Incidents</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {selectedPattern.incident_ids.length} incidents in this cluster
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedPattern.incident_ids.slice(0, 15).map((id) => (
                    <Link
                      key={id}
                      to={`/incidents/${id}`}
                      className="flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl text-[12px] transition-all group"
                    >
                      <div>
                        <div className="font-mono text-slate-700 text-[11px] group-hover:text-blue-700">{id}</div>
                        <div className="text-slate-400 text-[10px] mt-0.5">View full details →</div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </Link>
                  ))}
                  {selectedPattern.incident_ids.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No related incidents found
                    </div>
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
