import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
 Background, Controls, MiniMap, useNodesState, useEdgesState,
 addEdge, Node, Edge, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
 ArrowLeft, Plus, Shield, Zap, Activity, Brain, GitBranch,
 Users, Clock, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown,
} from 'lucide-react';
import {
 fetchIncident, updateIncident, fetchIncidentActions, createIncidentAction,
 fetchComments, createComment, fetchActivity,
} from '@/services/api';
import { PriorityBadge, StatusBadge, SIFBadge, BarrierBadge, ExposureBadge } from '@/components/ui/Badge';
import { PageLoading, ErrorState, EmptyState, Card } from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';
import type { Priority } from '@/types';
import clsx from 'clsx';

const TABS = [
 { id: 'overview', label: 'Overview' },
 { id: 'analysis', label: 'AI Analysis' },
 { id: 'sif', label: 'SIF Assessment' },
 { id: 'escalation', label: 'Escalation' },
 { id: 'barriers', label: 'Barriers' },
 { id: 'lsr', label: 'Life-Saving Rules' },
 { id: 'similar', label: 'Similar Incidents' },
 { id: 'actions', label: 'Actions' },
 { id: 'activity', label: 'Activity' },
];

const NODE_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
 event: { bg: '#F4F4F5', border: '#52525B', text: '#18181B' },
 hazard: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
 barrier: { bg: '#FFF7ED', border: '#F97316', text: '#9A3412' },
 exposure: { bg: '#F5F3FF', border: '#8B5CF6', text: '#5B21B6' },
 consequence: { bg: '#FEF2F2', border: '#DC2626', text: '#7F1D1D' },
};

function buildFlowElements(escalationGraph?: { nodes: any[]; edges: any[] }) {
 if (!escalationGraph) return { nodes: [], edges: [] };

 const flowNodes: Node[] = escalationGraph.nodes.map((n, i) => {
 const colors = NODE_TYPE_COLORS[n.type] || NODE_TYPE_COLORS.event;
 return {
 id: n.id,
 position: { x: 250, y: i * 120 },
 data: { label: n.label },
 style: {
 background: colors.bg,
 border: `1px solid ${colors.border}`,
 color: colors.text,
 borderRadius: 6,
 padding: '8px 12px',
 fontSize: 11,
 fontWeight: 500,
 maxWidth: 280,
 textAlign: 'center',
 whiteSpace: 'normal',
 },
 };
 });

 const flowEdges: Edge[] = escalationGraph.edges.map((e, i) => ({
 id: `edge-${i}`,
 source: e.source,
 target: e.target,
 label: e.label,
 markerEnd: { type: MarkerType.ArrowClosed },
 style: { stroke: '#94A3B8', strokeWidth: 1.5 },
 labelStyle: { fontSize: 10, fill: '#64748B' },
 }));

 return { nodes: flowNodes, edges: flowEdges };
}

// =====================================================
// Tab Components
// =====================================================

function OverviewTab({ incident }: { incident: any }) {
 const fields = [
 { label: 'Incident ID', value: incident.id },
 { label: 'Report Type', value: incident.report_type?.replace(/_/g, ' ').toUpperCase() },
 { label: 'Date', value: incident.report_date },
 { label: 'Site / Facility', value: incident.site_name },
 { label: 'Region', value: incident.region },
 { label: 'Location', value: incident.location },
 { label: 'Department', value: incident.department },
 { label: 'Activity', value: incident.activity },
 { label: 'Data Source', value: incident.source },
 ];

 return (
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Basic Info */}
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Incident Details</h3>
 <div className="space-y-2.5">
 {fields.map(({ label, value }) => (
 value ? (
 <div key={label} className="flex gap-3">
 <span className="text-xs text-mute w-32 shrink-0">{label}</span>
 <span className="text-xs text-ink font-medium">{value}</span>
 </div>
 ) : null
 ))}
 </div>
 </Card>

 {/* Description */}
 <div className="space-y-4">
 {incident.description && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
 <p className="text-sm text-gray-700 leading-relaxed">{incident.description}</p>
 </Card>
 )}

 {incident.actual_consequence && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-2">Actual Outcome</h3>
 <p className="text-sm text-gray-700">{incident.actual_consequence}</p>
 </Card>
 )}

 {incident.potential_consequence && (
 <Card className="p-4 border-orange-100">
 <h3 className="text-sm font-semibold text-orange-700 mb-2">⚠ Potential Consequence</h3>
 <p className="text-sm text-gray-700">{incident.potential_consequence}</p>
 </Card>
 )}
 </div>
 </div>
 );
}

function AIAnalysisTab({ incident }: { incident: any }) {
 const fields = [
 { label: 'Unsafe Act', value: incident.unsafe_act, color: 'text-red-700' },
 { label: 'Unsafe Condition', value: incident.unsafe_condition, color: 'text-orange-700' },
 { label: 'Hazard', value: incident.hazard, color: 'text-red-600' },
 { label: 'Energy Source', value: incident.energy_source, color: 'text-amber-700' },
 { label: 'Worker Exposure', value: incident.worker_exposure, color: 'text-purple-700' },
 { label: 'Existing Controls', value: incident.existing_controls, color: 'text-green-700' },
 { label: 'Missing Controls', value: incident.missing_controls, color: 'text-red-700' },
 { label: 'Actual Consequence', value: incident.actual_consequence, color: 'text-gray-700' },
 { label: 'Potential Consequence', value: incident.potential_consequence, color: 'text-orange-700' },
 ];

 return (
 <div className="space-y-4">
 {/* AI Model info */}
 <div className="flex items-center gap-2 text-xs text-mute bg-soft-cloud px-3 py-2 rounded border border-hairline">
 <Brain size={13} className="text-mute" />
 <span>AI Analysis by <strong>{incident.model_name || 'OpenAI GPT'}</strong></span>
 {incident.analyzed_at && <span>· {new Date(incident.analyzed_at).toLocaleDateString()}</span>}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {fields.map(({ label, value, color }) => (
 value ? (
 <Card key={label} className="p-4">
 <div className="text-xs font-semibold text-mute mb-1">{label}</div>
 <p className={clsx('text-sm leading-relaxed', color)}>{value}</p>
 </Card>
 ) : null
 ))}
 </div>

 {/* Causal Chain */}
 {incident.causal_chain && incident.causal_chain.length > 0 && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Causal Chain</h3>
 <div className="space-y-2">
 {incident.causal_chain.map((step: string, i: number) => (
 <div key={i} className="flex items-start gap-3">
 <span className="text-xs text-mute mt-0.5 font-mono w-5 shrink-0">{i + 1}.</span>
 <span className="text-sm text-gray-700">{step}</span>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* Key Evidence */}
 {incident.key_evidence && incident.key_evidence.length > 0 && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Evidence</h3>
 <div className="space-y-2">
 {incident.key_evidence.map((ev: string, i: number) => (
 <div key={i} className="flex items-start gap-2">
 <CheckCircle2 size={13} className="text-mute mt-0.5 shrink-0" />
 <span className="text-sm text-gray-700 italic">"{ev}"</span>
 </div>
 ))}
 </div>
 </Card>
 )}
 </div>
 );
}

function SIFAssessmentTab({ incident }: { incident: any }) {
 const score = incident.sif_score || 0;
 const factors = incident.sif_factors || {};

 const scoreColor = score >= 85 ? '#DC2626' : score >= 70 ? '#EA580C' : score >= 50 ? '#D97706' : '#16A34A';
 const scoreLabel = score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 50 ? 'MODERATE' : 'LOW';

 const factorRows = [
 { label: 'Hazard Severity', value: factors.hazard_severity, max: 5, description: 'Severity of identified hazard' },
 { label: 'Energy Magnitude', value: factors.energy, max: 5, description: 'Level of hazardous energy' },
 { label: 'Worker Exposure', value: factors.exposure, max: 5, description: 'Degree of worker exposure' },
 { label: 'Consequence Severity', value: factors.consequence, max: 5, description: 'Severity of potential consequence' },
 { label: 'Barrier Failure', value: factors.barrier_failure, max: 5, description: 'Failure of critical barriers' },
 { label: 'Causal Chain', value: factors.causal_chain, max: 5, description: 'Strength of causal chain evidence' },
 { label: 'SIF Pathway Credibility', value: factors.sif_pathway_credibility, max: 5, description: 'Overall SIF pathway credibility' },
 { label: 'Exposure Immediacy', value: factors.exposure_immediacy, max: 5, description: 'Immediacy of exposure' },
 { label: 'Escalation Evidence', value: factors.escalation_evidence, max: 5, description: 'Evidence of escalation potential' },
 { label: 'SIF Mechanism Strength', value: factors.sif_mechanism_strength, max: 5, description: 'Strength of SIF mechanism' },
 ].filter(f => f.value !== undefined && f.value !== null);

 return (
 <div className="space-y-6">
 {/* Score Display */}
 <Card className="p-6">
 <div className="flex items-center gap-8">
 {/* Circular score */}
 <div className="flex flex-col items-center">
 <div
 className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
 style={{ borderColor: scoreColor }}
 >
 <div className="text-center">
 <div className="text-2xl font-bold" style={{ color: scoreColor }}>{Math.round(score)}</div>
 <div className="text-[10px] text-mute">/ 100</div>
 </div>
 </div>
 <div className="mt-2 text-sm font-bold" style={{ color: scoreColor }}>{scoreLabel}</div>
 </div>

 <div className="flex-1">
 <div className="text-sm font-semibold text-ink mb-1">SIF Potential Score</div>
 <div className="text-xs text-mute mb-3">
 ⚠ NOTE: SIF score is NOT probability of death. It indicates SIF precursor severity.
 </div>
 <div className="flex items-center gap-2 mb-2">
 <ExposureBadge status={incident.exposure_status} />
 {incident.confidence && (
 <span className="text-xs text-mute">Confidence: {Math.round(incident.confidence)}%</span>
 )}
 </div>
 {incident.sif_classification && (
 <div className={clsx(
 'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border',
 incident.sif_classification === 'SIF_POTENTIAL'
 ? 'bg-red-50 text-red-700 border-red-200'
 : 'bg-soft-cloud text-mute border-hairline'
 )}>
 {incident.sif_classification === 'SIF_POTENTIAL' ? '⚠ SIF POTENTIAL' : 'NON-SIF'}
 </div>
 )}
 </div>
 </div>
 </Card>

 {/* Factor Breakdown */}
 {factorRows.length > 0 && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-4">SIF Factor Scores</h3>
 <div className="space-y-3">
 {factorRows.map(({ label, value, max, description }) => (
 <div key={label}>
 <div className="flex items-center justify-between mb-1">
 <span className="text-xs text-mute">{label}</span>
 <span className="text-xs font-semibold text-ink">{value}/{max}</span>
 </div>
 <div className="w-full bg-soft-cloud rounded-full h-1.5">
 <div
 className="h-1.5 rounded-full transition-all"
 style={{
 width: `${(value / max) * 100}%`,
 backgroundColor: (value / max) >= 0.8 ? '#DC2626' : (value / max) >= 0.6 ? '#EA580C' : '#52525B'
 }}
 />
 </div>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* SIF Evidence */}
 {incident.sif_evidence && incident.sif_evidence.length > 0 && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-3">SIF Evidence</h3>
 <div className="space-y-2">
 {incident.sif_evidence.map((ev: string, i: number) => (
 <div key={i} className="flex items-start gap-2">
 <CheckCircle2 size={13} className="text-red-500 mt-0.5 shrink-0" />
 <span className="text-sm text-gray-700">{ev}</span>
 </div>
 ))}
 </div>
 </Card>
 )}

 {/* SIF Reasoning */}
 {incident.sif_reasoning && (
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-2">AI SIF Reasoning</h3>
 <p className="text-sm text-gray-700 leading-relaxed">{incident.sif_reasoning}</p>
 {incident.sif_analyzed_at && (
 <div className="text-[10px] text-mute mt-2">Analyzed {new Date(incident.sif_analyzed_at).toLocaleDateString()}</div>
 )}
 </Card>
 )}
 </div>
 );
}

function EscalationTab({ incident }: { incident: any }) {
 const { nodes: initialNodes, edges: initialEdges } = buildFlowElements(incident.escalation_graph);
 const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
 const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

 if (!incident.escalation_graph || incident.escalation_graph.nodes.length === 0) {
 return (
 <EmptyState
 title="No escalation graph available"
 description="Escalation pathway will be generated when analysis is complete"
 />
 );
 }

 return (
 <div className="space-y-4">
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-1">Escalation Pathway</h3>
 <p className="text-xs text-mute mb-4">How this incident could escalate to a serious event or fatality</p>
 <div className="h-[500px] border border-hairline rounded">
 <ReactFlow
 nodes={nodes}
 edges={edges}
 onNodesChange={onNodesChange}
 onEdgesChange={onEdgesChange}
 fitView
 attributionPosition="bottom-left"
 >
 <Background color="#F1F5F9" />
 <Controls />
 </ReactFlow>
 </div>
 </Card>

 {/* What-if analysis */}
 {incident.potential_consequence && (
 <Card className="p-4 border-orange-100">
 <h3 className="text-sm font-semibold text-orange-700 mb-2">What-If Analysis</h3>
 <p className="text-xs text-mute mb-3">Factors that could have made this event fatal:</p>
 <ul className="space-y-1">
 {[
 'Longer exposure duration to the hazard',
 'Greater energy release magnitude',
 'Delayed detection of the unsafe condition',
 'Additional workers exposed to the hazard',
 'Emergency response delayed',
 ].map((factor, i) => (
 <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
 <AlertTriangle size={12} className="text-orange-500 mt-0.5 shrink-0" />
 {factor}
 </li>
 ))}
 </ul>
 </Card>
 )}
 </div>
 );
}

function BarriersTab({ incident }: { incident: any }) {
 const barriers = incident.barriers || [];

 if (barriers.length === 0) {
 return (
 <EmptyState
 title="No barrier data available"
 description="Barrier analysis has not been generated for this incident"
 />
 );
 }

 return (
 <div className="space-y-4">
 {/* Barrier health summary */}
 <div className="grid grid-cols-4 gap-3">
 {['FAILED', 'BYPASSED', 'PARTIALLY_EFFECTIVE', 'EFFECTIVE'].map((status) => {
 const count = barriers.filter((b: any) => b.status === status).length;
 return (
 <div key={status} className="bg-canvas border border-hairline rounded-none p-3 text-center">
 <div className="text-xl font-bold text-ink">{count}</div>
 <BarrierBadge status={status} />
 </div>
 );
 })}
 </div>

 {/* Individual barriers */}
 {barriers.map((barrier: any) => (
 <Card key={barrier.id} className="p-4">
 <div className="flex items-start justify-between mb-3">
 <div>
 <h4 className="text-sm font-semibold text-ink">{barrier.barrier_name}</h4>
 <div className="text-xs text-mute">{barrier.barrier_type} · {barrier.barrier_code}</div>
 </div>
 <div className="flex items-center gap-2">
 <BarrierBadge status={barrier.status as any} size="md" />
 {barrier.confidence && (
 <span className="text-xs text-mute">{Math.round(barrier.confidence)}% confidence</span>
 )}
 </div>
 </div>

 {barrier.reasoning && (
 <p className="text-sm text-gray-700 mb-2">{barrier.reasoning}</p>
 )}

 {barrier.evidence && barrier.evidence.length > 0 && (
 <div className="space-y-1">
 {barrier.evidence.map((ev: string, i: number) => (
 <div key={i} className="flex items-start gap-2 text-xs text-mute">
 <span className="text-orange-500 shrink-0">›</span>
 <span>{ev}</span>
 </div>
 ))}
 </div>
 )}

 {barrier.criticality && (
 <div className="mt-2 text-xs text-mute">
 Criticality: {barrier.criticality}/5
 </div>
 )}
 </Card>
 ))}
 </div>
 );
}

function LSRTab({ incident }: { incident: any }) {
 const lsrs = incident.life_saving_rules || [];

 if (lsrs.length === 0) {
 return (
 <EmptyState
 title="No Life-Saving Rules mapped"
 description="LSR analysis has not been generated for this incident"
 />
 );
 }

 return (
 <div className="space-y-4">
 {lsrs.map((lsr: any) => (
 <Card key={lsr.id} className="p-4">
 <div className="flex items-start justify-between mb-2">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Shield size={14} className="text-ink" />
 <h4 className="text-sm font-semibold text-ink">{lsr.rule_name}</h4>
 </div>
 <div className="text-xs text-mute">{lsr.rule_code}</div>
 </div>
 <div className="flex items-center gap-2">
 {lsr.priority && (
 <span className={clsx(
 'text-xs font-semibold px-2 py-0.5 rounded border',
 lsr.priority === 'PRIMARY' ? 'bg-soft-cloud text-ink border-hairline' : 'bg-soft-cloud text-mute border-hairline'
 )}>
 {lsr.priority}
 </span>
 )}
 {lsr.confidence && (
 <span className="text-xs text-mute">{Math.round(lsr.confidence)}%</span>
 )}
 </div>
 </div>

 {lsr.description && (
 <p className="text-sm text-gray-700 mb-2">{lsr.description}</p>
 )}

 {lsr.trigger && (
 <div className="text-xs text-mute mb-2">
 <strong>Trigger: </strong>{lsr.trigger}
 </div>
 )}

 {lsr.evidence && lsr.evidence.length > 0 && (
 <div className="space-y-1">
 {lsr.evidence.map((ev: string, i: number) => (
 <div key={i} className="flex items-start gap-2 text-xs text-mute">
 <CheckCircle2 size={11} className="text-mute mt-0.5 shrink-0" />
 <span>{ev}</span>
 </div>
 ))}
 </div>
 )}
 </Card>
 ))}
 </div>
 );
}

function SimilarTab({ incident }: { incident: any }) {
 const navigate = useNavigate();
 const similar = incident.similar_incidents || [];

 if (similar.length === 0) {
 return (
 <EmptyState
 title="No similar incidents found"
 description="Similar incidents are found using semantic vector search"
 />
 );
 }

 return (
 <div className="space-y-3">
 {similar.map((sim: any) => (
 <Card
 key={sim.id}
 className="p-4"
 onClick={() => navigate(`/incidents/${sim.id}`)}
 >
 <div className="flex items-start justify-between mb-1">
 <div>
 <span className="text-[10px] font-mono text-mute">{sim.id}</span>
 <h4 className="text-sm font-medium text-ink">{sim.title}</h4>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <span className="text-xs font-semibold text-ink">
 {Math.round(sim.similarity_score * 100)}% similar
 </span>
 {sim.sif_score && <SIFBadge score={sim.sif_score} classification={sim.sif_classification} />}
 </div>
 </div>
 <div className="text-xs text-mute">
 {sim.site_name} · {sim.report_date} · {sim.report_type}
 </div>
 {sim.common_hazards.length > 0 && (
 <div className="mt-1 text-xs text-mute">Common hazard: {sim.common_hazards.join(', ')}</div>
 )}
 </Card>
 ))}
 </div>
 );
}

function ActionsTab({ reportId, incident }: { reportId: string; incident: any }) {
 const queryClient = useQueryClient();
 const { addToast } = useUIStore();
 const [showCreate, setShowCreate] = useState(false);
 const [form, setForm] = useState({ title: '', owner: '', priority: 'HIGH' as Priority, due_date: '' });

 const { data: actions = [] as any[] } = useQuery({
 queryKey: ['actions', reportId],
 queryFn: () => fetchIncidentActions(reportId),
 });

 const createMutation = useMutation({
 mutationFn: (data: any) => createIncidentAction(reportId, data),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['actions'] });
 setShowCreate(false);
 setForm({ title: '', owner: '', priority: 'HIGH', due_date: '' });
 addToast('Action created', 'success');
 },
 onError: () => addToast('Failed to create action', 'error'),
 });

 // Pre-populate recommended actions
 const recommended = incident.recommended_actions || [];

 return (
 <div className="space-y-4">
 {/* Header */}
 <div className="flex items-center justify-between">
 <h3 className="text-sm font-semibold text-gray-700">Actions & Interventions</h3>
 <button
 onClick={() => setShowCreate(!showCreate)}
 className="flex items-center gap-1.5 text-xs bg-ink text-canvas px-3 py-1.5 rounded hover:bg-ink"
 >
 <Plus size={13} />
 New Action
 </button>
 </div>

 {/* Recommended Actions */}
 {recommended.length > 0 && (
 <Card className="p-4">
 <h4 className="text-xs font-semibold text-mute mb-2">AI Recommended Actions</h4>
 <div className="space-y-2">
 {recommended.map((action: string, i: number) => (
 <button
 key={i}
 onClick={() => setForm(f => ({ ...f, title: action }))}
 className="w-full text-left flex items-start gap-2 p-2 hover:bg-soft-cloud rounded text-sm text-gray-700 border border-dashed border-hairline"
 >
 <Plus size={12} className="text-mute mt-0.5 shrink-0" />
 <span>{action}</span>
 </button>
 ))}
 </div>
 </Card>
 )}

 {/* Create form */}
 {showCreate && (
 <Card className="p-4">
 <h4 className="text-sm font-semibold text-gray-700 mb-3">Create Action</h4>
 <div className="space-y-3">
 <div>
 <label className="text-xs text-mute mb-1 block">Title *</label>
 <input
 value={form.title}
 onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
 placeholder="Action title..."
 className="w-full border border-hairline rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
 />
 </div>
 <div className="grid grid-cols-3 gap-2">
 <div>
 <label className="text-xs text-mute mb-1 block">Owner</label>
 <input
 value={form.owner}
 onChange={(e) => setForm(f => ({ ...f, owner: e.target.value }))}
 placeholder="Assignee..."
 className="w-full border border-hairline rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
 />
 </div>
 <div>
 <label className="text-xs text-mute mb-1 block">Priority</label>
 <select
 value={form.priority}
 onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as Priority }))}
 className="w-full border border-hairline rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink bg-canvas"
 >
 <option value="CRITICAL">CRITICAL</option>
 <option value="HIGH">HIGH</option>
 <option value="MEDIUM">MEDIUM</option>
 <option value="LOW">LOW</option>
 </select>
 </div>
 <div>
 <label className="text-xs text-mute mb-1 block">Due Date</label>
 <input
 type="date"
 value={form.due_date}
 onChange={(e) => setForm(f => ({ ...f, due_date: e.target.value }))}
 className="w-full border border-hairline rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink"
 />
 </div>
 </div>
 <div className="flex gap-2 justify-end">
 <button onClick={() => setShowCreate(false)} className="text-xs text-mute px-3 py-1.5 hover:bg-soft-cloud rounded border border-hairline">Cancel</button>
 <button
 onClick={() => createMutation.mutate({ title: form.title, owner: form.owner, priority: form.priority, due_date: form.due_date })}
 disabled={!form.title || createMutation.isPending}
 className="text-xs bg-ink text-canvas px-3 py-1.5 rounded hover:bg-ink disabled:opacity-50"
 >
 {createMutation.isPending ? 'Creating...' : 'Create'}
 </button>
 </div>
 </div>
 </Card>
 )}

 {/* Actions list */}
 {actions.length === 0 && !showCreate ? (
 <EmptyState title="No actions yet" description="Create an action to track follow-up interventions" />
 ) : (
 <div className="space-y-2">
 {actions.map((action) => (
 <Card key={action.id} className="p-3">
 <div className="flex items-center justify-between">
 <div>
 <div className="text-xs font-mono text-mute">{action.id.slice(0, 8)}</div>
 <div className="text-sm text-ink font-medium">{action.title}</div>
 {action.owner && <div className="text-xs text-mute">Owner: {action.owner}</div>}
 {action.due_date && <div className="text-xs text-mute">Due: {action.due_date}</div>}
 </div>
 <div className="flex items-center gap-2">
 <PriorityBadge priority={action.priority} />
 <StatusBadge status={action.status as any} />
 </div>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}

function ActivityTab({ reportId }: { reportId: string }) {
 const { data: activities = [] as any[] } = useQuery({
 queryKey: ['activity', reportId],
 queryFn: () => fetchActivity(reportId),
 });

 const { data: comments = [] } = useQuery({
 queryKey: ['comments', reportId],
 queryFn: () => fetchComments(reportId),
 });

 const [commentText, setCommentText] = useState('');
 const queryClient = useQueryClient();
 const { addToast } = useUIStore();

 const commentMutation = useMutation({
 mutationFn: () => createComment(reportId, { author: 'HSE User', content: commentText }),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['comments', reportId] });
 setCommentText('');
 addToast('Comment added', 'success');
 },
 });

 return (
 <div className="space-y-4">
 {/* Add comment */}
 <Card className="p-4">
 <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Comment</h3>
 <textarea
 value={commentText}
 onChange={(e) => setCommentText(e.target.value)}
 placeholder="Add a note or comment..."
 rows={3}
 className="w-full border border-hairline rounded px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink resize-none"
 />
 <div className="flex justify-end mt-2">
 <button
 onClick={() => commentMutation.mutate()}
 disabled={!commentText.trim() || commentMutation.isPending}
 className="text-xs bg-ink text-canvas px-3 py-1.5 rounded hover:bg-ink disabled:opacity-50"
 >
 {commentMutation.isPending ? 'Posting...' : 'Post Comment'}
 </button>
 </div>
 </Card>

 {/* Comments */}
 {comments.length > 0 && (
 <div className="space-y-2">
 {comments.map((comment) => (
 <Card key={comment.id} className="p-3">
 <div className="flex items-center gap-2 mb-1">
 <span className="text-xs font-semibold text-gray-700">{comment.author}</span>
 <span className="text-xs text-mute">{comment.created_at ? new Date(comment.created_at).toLocaleString() : ''}</span>
 </div>
 <p className="text-sm text-gray-700">{comment.content}</p>
 </Card>
 ))}
 </div>
 )}

 {/* Activity log */}
 {activities.length > 0 && (
 <div>
 <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Timeline</h3>
 <div className="space-y-2">
 {activities.map((entry) => (
 <div key={entry.id} className="flex items-start gap-3 text-sm">
 <div className="w-2 h-2 rounded-full bg-zinc-700 mt-1.5 shrink-0" />
 <div>
 <span className="font-medium text-gray-700">{entry.event_type.replace(/_/g, ' ')}</span>
 {entry.actor && <span className="text-mute"> by {entry.actor}</span>}
 {entry.created_at && <div className="text-xs text-mute">{new Date(entry.created_at).toLocaleString()}</div>}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {comments.length === 0 && activities.length === 0 && (
 <EmptyState title="No activity yet" description="Comments and status changes will appear here" />
 )}
 </div>
 );
}

// =====================================================
// Main Incident Detail Page
// =====================================================
export function IncidentDetail() {
 const { id } = useParams<{ id: string }>();
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { addToast } = useUIStore();
 const [activeTab, setActiveTab] = useState('overview');

 const { data: incident, isLoading, error, refetch } = useQuery({
 queryKey: ['incident', id],
 queryFn: () => fetchIncident(id!),
 enabled: !!id,
 staleTime: 30000,
 });

 const updateMutation = useMutation({
 mutationFn: (update: { priority?: Priority; status?: any; assigned_to?: string }) =>
 updateIncident(id!, update),
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['incident', id] });
 addToast('Updated successfully', 'success');
 },
 onError: () => addToast('Update failed', 'error'),
 });

 if (isLoading) return <PageLoading />;
 if (error || !incident) return <ErrorState message="Incident not found" onRetry={() => refetch()} />;

 return (
 <div className="flex flex-col h-full">
 {/* Incident Header */}
 <div className="bg-canvas border-b border-hairline px-6 py-4">
 {/* Breadcrumb */}
 <div className="flex items-center gap-2 text-xs text-mute mb-3">
 <button onClick={() => navigate('/incidents')} className="flex items-center gap-1 hover:text-ink">
 <ArrowLeft size={12} />
 Incidents
 </button>
 <span>/</span>
 <span className="font-mono">{incident.id}</span>
 </div>

 {/* Header content */}
 <div className="flex items-start justify-between gap-4">
 <div className="min-w-0">
 <h1 className="text-lg font-bold text-ink mb-1">{incident.title}</h1>
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-xs font-mono text-mute">{incident.id}</span>
 <PriorityBadge priority={incident.priority} size="md" />
 <StatusBadge status={incident.status} size="md" />
 <SIFBadge score={incident.sif_score} classification={incident.sif_classification} />
 <ExposureBadge status={incident.exposure_status} />
 {incident.confidence && (
 <span className="text-xs text-mute">Confidence: {Math.round(incident.confidence)}%</span>
 )}
 </div>
 <div className="mt-1.5 flex items-center gap-3 text-xs text-mute">
 {incident.site_name && <span>📍 {incident.site_name}</span>}
 {incident.department && <span>🏢 {incident.department}</span>}
 {incident.activity && <span>⚙ {incident.activity}</span>}
 {incident.report_date && <span>📅 {incident.report_date}</span>}
 </div>
 </div>

 {/* Quick actions */}
 <div className="flex items-center gap-2 shrink-0">
 <select
 value={incident.priority}
 onChange={(e) => updateMutation.mutate({ priority: e.target.value as Priority })}
 className="text-xs border border-hairline rounded px-2 py-1.5 bg-canvas focus:outline-none focus:ring-2 focus:ring-ink"
 >
 <option value="CRITICAL">CRITICAL</option>
 <option value="HIGH">HIGH</option>
 <option value="MEDIUM">MEDIUM</option>
 <option value="LOW">LOW</option>
 </select>
 <select
 value={incident.status}
 onChange={(e) => updateMutation.mutate({ status: e.target.value as any })}
 className="text-xs border border-hairline rounded px-2 py-1.5 bg-canvas focus:outline-none focus:ring-2 focus:ring-ink"
 >
 <option value="OPEN">OPEN</option>
 <option value="INVESTIGATING">INVESTIGATING</option>
 <option value="ACTION_REQUIRED">ACTION REQUIRED</option>
 <option value="CLOSED">CLOSED</option>
 </select>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="border-b border-hairline bg-canvas px-6">
 <div className="flex gap-0 overflow-x-auto">
 {TABS.map((tab) => (
 <button
 key={tab.id}
 onClick={() => setActiveTab(tab.id)}
 className={clsx(
 'px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors',
 activeTab === tab.id
 ? 'border-ink text-ink'
 : 'border-transparent text-mute hover:text-gray-700 hover:border-gray-300'
 )}
 >
 {tab.label}
 {tab.id === 'barriers' && incident.barriers.length > 0 && (
 <span className="ml-1 bg-soft-cloud text-mute rounded-full px-1.5 text-[10px]">
 {incident.barriers.length}
 </span>
 )}
 {tab.id === 'lsr' && incident.life_saving_rules.length > 0 && (
 <span className="ml-1 bg-soft-cloud text-mute rounded-full px-1.5 text-[10px]">
 {incident.life_saving_rules.length}
 </span>
 )}
 {tab.id === 'similar' && incident.similar_incidents.length > 0 && (
 <span className="ml-1 bg-soft-cloud text-mute rounded-full px-1.5 text-[10px]">
 {incident.similar_incidents.length}
 </span>
 )}
 </button>
 ))}
 </div>
 </div>

 {/* Tab content */}
 <div className="flex-1 overflow-auto p-6 bg-soft-cloud">
 {activeTab === 'overview' && <OverviewTab incident={incident} />}
 {activeTab === 'analysis' && <AIAnalysisTab incident={incident} />}
 {activeTab === 'sif' && <SIFAssessmentTab incident={incident} />}
 {activeTab === 'escalation' && <EscalationTab incident={incident} />}
 {activeTab === 'barriers' && <BarriersTab incident={incident} />}
 {activeTab === 'lsr' && <LSRTab incident={incident} />}
 {activeTab === 'similar' && <SimilarTab incident={incident} />}
 {activeTab === 'actions' && <ActionsTab reportId={id!} incident={incident} />}
 {activeTab === 'activity' && <ActivityTab reportId={id!} />}
 </div>
 </div>
 );
}
