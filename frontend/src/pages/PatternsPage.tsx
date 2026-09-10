import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { fetchPatterns } from '@/services/api';
import { PageLoading, ErrorState, Card, EmptyState } from '@/components/ui/Toast';
import { TrendBadge } from '@/components/ui/Badge';
import { GitBranch, Activity, MapPin } from 'lucide-react';
import clsx from 'clsx';
import { Link } from 'react-router-dom';
import type { PatternCluster } from '@/types';

function buildPatternGraph(pattern: PatternCluster) {
  const nodes: Node[] = [
    {
      id: 'center',
      data: { label: pattern.label },
      position: { x: 250, y: 150 },
      style: { background: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: '8px', padding: '12px', fontWeight: 'bold' }
    },
    {
      id: 'hazard',
      data: { label: pattern.hazard_type },
      position: { x: 250, y: 50 },
      style: { background: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '4px', padding: '8px' }
    }
  ];

  const edges: Edge[] = [
    { id: 'e1', source: 'hazard', target: 'center', animated: true, style: { stroke: '#EF4444' } }
  ];

  // Add facility nodes around
  pattern.facilities.slice(0, 3).forEach((fac, i) => {
    const xOffset = (i - 1) * 200;
    nodes.push({
      id: `fac-${i}`,
      data: { label: fac },
      position: { x: 250 + xOffset, y: 250 },
      style: { background: '#F8FAFC', border: '1px dashed #94A3B8', borderRadius: '4px', padding: '6px' }
    });
    edges.push({ id: `e-fac-${i}`, source: 'center', target: `fac-${i}` });
  });

  return { nodes, edges };
}

export function PatternsPage() {
  const [selectedPattern, setSelectedPattern] = useState<PatternCluster | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['patterns'],
    queryFn: () => fetchPatterns(),
  });

  if (isLoading) return <PageLoading />;
  if (error || !data) return <ErrorState message="Failed to load patterns" />;

  const patterns = data;

  return (
    <div className="flex h-full">
      {/* List Sidebar */}
      <div className="w-1/3 min-w-[320px] max-w-sm border-r border-gray-200 bg-white flex flex-col h-full z-10">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <GitBranch size={16} className="text-blue-600" />
            Detected Patterns
          </h2>
          <p className="text-xs text-gray-500 mt-1">AI-clustered incident trends</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {patterns.map((pattern) => (
            <Card 
              key={pattern.id}
              className={clsx(
                'p-3 cursor-pointer transition-all',
                selectedPattern?.id === pattern.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50' : 'hover:border-blue-300'
              )}
              onClick={() => setSelectedPattern(pattern)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-sm text-gray-900 line-clamp-2 pr-2">{pattern.label}</h3>
                <TrendBadge trend={pattern.trend as any} />
              </div>
              
              <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-2">
                <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                  {pattern.count} incidents
                </span>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                  Avg SIF: {pattern.avg_sif_score}
                </span>
              </div>
              
              <div className="text-xs text-gray-500 truncate">
                {pattern.hazard_type}
              </div>
            </Card>
          ))}
          {patterns.length === 0 && (
            <div className="text-center py-8 text-sm text-gray-500">No patterns detected</div>
          )}
        </div>
      </div>

      {/* Main Content (Graph & Details) */}
      <div className="flex-1 flex flex-col bg-gray-50 relative h-full">
        {!selectedPattern ? (
          <EmptyState 
            title="Select a pattern" 
            description="Choose a pattern from the sidebar to view its details and relationships" 
            icon={<GitBranch size={32} className="text-gray-300" />}
          />
        ) : (
          <>
            <div className="p-6 bg-white border-b border-gray-200 shadow-sm z-10">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-2">{selectedPattern.label}</h1>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Activity size={14} /> Hazard: {selectedPattern.hazard_type}</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> Affected Sites: {selectedPattern.facility_count}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600 mb-1">{selectedPattern.count}</div>
                  <div className="text-xs text-gray-500">Total Occurrences</div>
                </div>
              </div>
            </div>

            <div className="flex-1 relative">
              {(() => {
                const { nodes, edges } = buildPatternGraph(selectedPattern);
                return (
                  <ReactFlow nodes={nodes} edges={edges} fitView attributionPosition="bottom-right">
                    <Background color="#CBD5E1" gap={16} />
                    <Controls />
                  </ReactFlow>
                );
              })()}
              
              {/* Related Incidents Panel */}
              <div className="absolute right-4 top-4 bottom-4 w-80 bg-white/95 backdrop-blur border border-gray-200 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/90">
                  <h3 className="font-semibold text-gray-800 text-sm">Recent Related Incidents</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {selectedPattern.incident_ids.slice(0, 10).map((id) => (
                    <Link 
                      key={id} 
                      to={`/incidents/${id}`}
                      className="block p-2 text-sm border border-gray-100 rounded hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <div className="font-mono text-xs text-blue-600 mb-1">{id}</div>
                      <div className="text-gray-700 truncate text-xs">View full incident details →</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
