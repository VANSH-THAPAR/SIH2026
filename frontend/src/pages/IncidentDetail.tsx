import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactFlow, {
  Background, Controls, useNodesState, useEdgesState,
  Node, Edge, MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  ArrowLeft, Plus, Shield, Brain, CheckCircle2,
  AlertTriangle, ChevronDown,
} from 'lucide-react';
import {
  fetchIncident, updateIncident, fetchIncidentActions, createIncidentAction,
  fetchComments, createComment, fetchActivity,
} from '@/services/api';
import {
  PriorityBadge, StatusBadge, SIFBadge, BarrierBadge, ExposureBadge,
} from '@/components/ui/Badge';
import { ErrorState, EmptyState, Card } from '@/components/ui/Toast';
import { useUIStore } from '@/store/uiStore';
import type { Priority } from '@/types';
import clsx from 'clsx';

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'analysis', label: 'AI Analysis' },
  { id: 'sif', label: 'SIF Assessment' },
  { id: 'escalation', label: 'Escalation' },
  { id: 'barriers', label: 'Barriers' },
  { id: 'lsr', label: 'Life-Saving Rules' },
  { id: 'similar', label: 'Similar Incidents' },
  { id: 'actions', label: 'Actions' },
];

// ─── Escalation Graph ─────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  event: { bg: 'var(--color-surface)', border: 'var(--color-border-strong)', text: 'var(--color-text-primary)' },
  hazard: { bg: 'var(--color-critical-bg)', border: 'var(--color-critical-border)', text: 'var(--color-critical)' },
  barrier: { bg: 'var(--color-high-bg)', border: 'var(--color-high-border)', text: 'var(--color-high)' },
  exposure: { bg: 'var(--color-info-bg)', border: 'var(--color-info-border)', text: 'var(--color-info)' },
  consequence: { bg: 'var(--color-critical-bg)', border: 'var(--color-critical-border)', text: 'var(--color-critical)' },
};

function buildFlowElements(escalationGraph?: { nodes: any[]; edges: any[] }) {
  if (!escalationGraph) return { nodes: [], edges: [] };

  const flowNodes: Node[] = escalationGraph.nodes.map((n, i) => {
    const colors = NODE_COLORS[n.type] || NODE_COLORS.event;
    return {
      id: n.id,
      position: { x: 260, y: i * 120 },
      data: { label: n.label },
      style: {
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        borderRadius: 8,
        padding: '8px 14px',
        fontSize: 11,
        fontWeight: 600,
        maxWidth: 280,
        textAlign: 'center' as const,
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
    style: { stroke: 'var(--color-border-strong)', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: 'var(--color-text-secondary)' },
  }));

  return { nodes: flowNodes, edges: flowEdges };
}

// ─── Field Row ────────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2.5 border-b border-[var(--color-border)] last:border-0">
      <span className="text-[11px] text-[var(--color-text-tertiary)] w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-[12.5px] text-[var(--color-text-primary)] font-medium leading-relaxed">{value}</span>
    </div>
  );
}

// ─── Analysis Field Card ──────────────────────────────────────────────────────

function AnalysisField({ label, value, accent }: { label: string; value?: string | null; accent?: string }) {
  if (!value) return null;
  return (
    <Card className="p-4">
      <div className="text-[10.5px] font-semibold text-[var(--color-text-tertiary)] mb-2 uppercase tracking-wide">
        {label}
      </div>
      <p className={clsx('text-[13px] leading-relaxed text-[var(--color-text-primary)]')} style={accent ? { color: accent } : undefined}>
        {value}
      </p>
    </Card>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ incident }: { incident: any }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3 uppercase tracking-wide">
            Incident Details
          </h3>
          <div>
            <FieldRow label="Incident ID" value={incident.id} />
            <FieldRow label="Report Type" value={incident.report_type?.replace(/_/g, ' ').toUpperCase()} />
            <FieldRow label="Date" value={incident.report_date} />
            <FieldRow label="Site / Facility" value={incident.site_name} />
            <FieldRow label="Region" value={incident.region} />
            <FieldRow label="Location" value={incident.location} />
            <FieldRow label="Department" value={incident.department} />
            <FieldRow label="Activity" value={incident.activity} />
            <FieldRow label="Data Source" value={incident.source} />
          </div>
        </Card>

        <div className="space-y-4">
          {incident.description && (
            <Card className="p-5">
              <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-2">Description</h3>
              <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{incident.description}</p>
            </Card>
          )}
          {incident.actual_consequence && (
            <Card className="p-5">
              <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-2">Actual Outcome</h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{incident.actual_consequence}</p>
            </Card>
          )}
          {incident.potential_consequence && (
            <Card className="p-5" style={{ borderColor: 'var(--color-high-border)', borderLeftWidth: 3, borderLeftColor: 'var(--color-high)' }}>
              <h3 className="text-[12px] font-bold mb-2" style={{ color: 'var(--color-high)' }}>
                ⚠ Potential Consequence
              </h3>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-high)' }}>
                {incident.potential_consequence}
              </p>
            </Card>
          )}
        </div>
      </div>
      
      <div className="pt-4 border-t border-[var(--color-border)]">
        <h3 className="text-[14px] font-bold text-[var(--color-text-primary)] mb-4">Discussion & Activity</h3>
        <ActivityTab reportId={incident.id} />
      </div>
    </div>
  );
}

// ─── AI Analysis Tab ──────────────────────────────────────────────────────────

function AIAnalysisTab({ incident }: { incident: any }) {
  return (
    <div className="space-y-4">
      {/* AI provenance banner */}
      <div
        className="flex items-center gap-2.5 text-[11.5px] px-4 py-2.5 rounded-xl border"
        style={{
          background: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <Brain size={14} style={{ color: 'var(--color-text-tertiary)' }} />
        <span>
          AI Analysis by{' '}
          <strong className="text-[var(--color-text-primary)]">{incident.model_name || 'GPT'}</strong>
        </span>
        {incident.analyzed_at && (
          <span className="text-[var(--color-text-tertiary)]">
            · {new Date(incident.analyzed_at).toLocaleDateString('en-IN')}
          </span>
        )}
        <span
          className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded"
          style={{ background: 'var(--color-surface-strong)', color: 'var(--color-primary)' }}
        >
          AI GENERATED
        </span>
      </div>

      {/* Analysis fields */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AnalysisField label="Unsafe Act" value={incident.unsafe_act} accent="var(--color-critical)" />
        <AnalysisField label="Unsafe Condition" value={incident.unsafe_condition} accent="var(--color-high)" />
        <AnalysisField label="Identified Hazard" value={incident.hazard} accent="var(--color-critical)" />
        <AnalysisField label="Energy Source" value={incident.energy_source} accent="var(--color-medium)" />
        <AnalysisField label="Worker Exposure" value={incident.worker_exposure} />
        <AnalysisField label="Existing Controls" value={incident.existing_controls} accent="var(--color-low)" />
        <AnalysisField label="Missing Controls" value={incident.missing_controls} accent="var(--color-critical)" />
      </div>

      {/* Causal Chain */}
      {incident.causal_chain?.length > 0 && (
        <Card className="p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3">Causal Chain</h3>
          <div className="space-y-2">
            {incident.causal_chain.map((step: string, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold text-white"
                  style={{ background: 'var(--color-text-tertiary)' }}
                >
                  {i + 1}
                </div>
                <span className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Key Evidence */}
      {incident.key_evidence?.length > 0 && (
        <Card className="p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3">Key Evidence</h3>
          <div className="space-y-2">
            {incident.key_evidence.map((ev: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-low)' }} />
                <span className="text-[12.5px] text-[var(--color-text-secondary)] italic">"{ev}"</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── SIF Assessment Tab ────────────────────────────────────────────────────────

function SIFAssessmentTab({ incident }: { incident: any }) {
  const score = incident.sif_score || 0;
  const factors = incident.sif_factors || {};

  const scoreColor =
    score >= 85
      ? 'var(--color-critical)'
      : score >= 70
      ? 'var(--color-high)'
      : score >= 50
      ? 'var(--color-medium)'
      : 'var(--color-low)';
  const scoreLabel = score >= 85 ? 'CRITICAL' : score >= 70 ? 'HIGH' : score >= 50 ? 'MODERATE' : 'LOW';

  const factorRows = [
    { label: 'Hazard Severity', value: factors.hazard_severity, max: 5 },
    { label: 'Energy Magnitude', value: factors.energy, max: 5 },
    { label: 'Worker Exposure', value: factors.exposure, max: 5 },
    { label: 'Consequence Severity', value: factors.consequence, max: 5 },
    { label: 'Barrier Failure', value: factors.barrier_failure, max: 5 },
    { label: 'Causal Chain', value: factors.causal_chain, max: 5 },
    { label: 'SIF Pathway Credibility', value: factors.sif_pathway_credibility, max: 5 },
    { label: 'Exposure Immediacy', value: factors.exposure_immediacy, max: 5 },
    { label: 'Escalation Evidence', value: factors.escalation_evidence, max: 5 },
    { label: 'SIF Mechanism Strength', value: factors.sif_mechanism_strength, max: 5 },
  ].filter((f) => f.value != null);

  return (
    <div className="space-y-5">
      {/* Score display */}
      <Card className="p-6">
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className="w-24 h-24 rounded-full border-4 flex items-center justify-center"
              style={{ borderColor: scoreColor }}
            >
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: scoreColor }}>{Math.round(score)}</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)]">/ 100</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] font-bold" style={{ color: scoreColor }}>{scoreLabel}</div>
          </div>

          <div className="flex-1">
            <div className="text-[13px] font-bold text-[var(--color-text-primary)] mb-1">SIF Potential Score</div>
            <div className="text-[11.5px] text-[var(--color-text-tertiary)] mb-3">
              ⚠ NOTE: SIF score is NOT probability of death. It indicates SIF precursor severity.
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <ExposureBadge status={incident.exposure_status} />
              {incident.confidence != null && (
                <span className="text-[11px] text-[var(--color-text-secondary)]">
                  Confidence: {Math.round(incident.confidence)}%
                </span>
              )}
              {incident.sif_classification && (
                <span
                  className="text-[11px] font-bold px-2 py-1 rounded-lg border"
                  style={{
                    background: incident.sif_classification === 'SIF_POTENTIAL' ? 'var(--color-critical-bg)' : 'var(--color-surface)',
                    color: incident.sif_classification === 'SIF_POTENTIAL' ? 'var(--color-critical)' : 'var(--color-text-secondary)',
                    borderColor: incident.sif_classification === 'SIF_POTENTIAL' ? 'var(--color-critical-border)' : 'var(--color-border)',
                  }}
                >
                  {incident.sif_classification === 'SIF_POTENTIAL' ? '⚠ SIF POTENTIAL' : 'NON-SIF'}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Factor breakdown */}
      {factorRows.length > 0 && (
        <Card className="p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-4">SIF Factor Scores</h3>
          <div className="space-y-3">
            {factorRows.map(({ label, value, max }) => {
              const pct = (value / max) * 100;
              const barColor = pct >= 80 ? 'var(--color-critical)' : pct >= 60 ? 'var(--color-high)' : 'var(--color-border-strong)';
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11.5px] text-[var(--color-text-secondary)]">{label}</span>
                    <span className="text-[11.5px] font-bold text-[var(--color-text-primary)]">{value}/{max}</span>
                  </div>
                  <div className="w-full bg-[var(--color-surface)] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: barColor }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* SIF Evidence */}
      {incident.sif_evidence?.length > 0 && (
        <Card className="p-5">
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3">SIF Evidence</h3>
          <div className="space-y-2">
            {incident.sif_evidence.map((ev: string, i: number) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-critical)' }} />
                <span className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{ev}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* SIF Reasoning */}
      {incident.sif_reasoning && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} style={{ color: 'var(--color-text-tertiary)' }} />
            <h3 className="text-[12px] font-bold text-[var(--color-text-primary)]">AI SIF Reasoning</h3>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-surface-strong)', color: 'var(--color-primary)' }}
            >
              AI GENERATED
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-text-primary)] leading-relaxed">{incident.sif_reasoning}</p>
          {incident.sif_analyzed_at && (
            <div className="text-[10px] text-[var(--color-text-tertiary)] mt-2">
              Analyzed {new Date(incident.sif_analyzed_at).toLocaleDateString('en-IN')}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ─── Escalation Tab ────────────────────────────────────────────────────────────

function EscalationTab({ incident }: { incident: any }) {
  const { nodes: initNodes, edges: initEdges } = buildFlowElements(incident.escalation_graph);
  const [nodes, , onNodesChange] = useNodesState(initNodes);
  const [edges, , onEdgesChange] = useEdgesState(initEdges);

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
      <Card className="p-5">
        <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-1">Escalation Pathway</h3>
        <p className="text-[11.5px] text-[var(--color-text-tertiary)] mb-4">
          How this incident could escalate to a serious event or fatality
        </p>
        <div className="h-[480px] border border-[var(--color-border)] rounded-xl overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background color="var(--color-border)" gap={20} />
            <Controls />
          </ReactFlow>
        </div>
      </Card>

      {incident.potential_consequence && (
        <Card className="p-5" style={{ borderColor: 'var(--color-high-border)' }}>
          <h3 className="text-[12px] font-bold mb-2" style={{ color: 'var(--color-high)' }}>
            What-If Analysis
          </h3>
          <p className="text-[11.5px] text-[var(--color-text-secondary)] mb-3">
            Factors that could have escalated this event to a fatality:
          </p>
          <ul className="space-y-1.5">
            {[
              'Longer exposure duration to the hazard',
              'Greater energy release magnitude',
              'Delayed detection of the unsafe condition',
              'Additional workers exposed to the hazard',
              'Emergency response delayed',
            ].map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--color-text-primary)]">
                <AlertTriangle size={12} className="flex-shrink-0 mt-1" style={{ color: 'var(--color-high)' }} />
                {factor}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ─── Barriers Tab ─────────────────────────────────────────────────────────────

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

  const statuses = ['FAILED', 'BYPASSED', 'PARTIALLY_EFFECTIVE', 'EFFECTIVE'];

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3">
        {statuses.map((status) => {
          const count = barriers.filter((b: any) => b.status === status).length;
          return (
            <div key={status} className="bg-white border border-[var(--color-border)] rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-[var(--color-text-primary)] mb-1">{count}</div>
              <BarrierBadge status={status} />
            </div>
          );
        })}
      </div>

      {/* Individual barriers */}
      {barriers.map((barrier: any) => (
        <Card key={barrier.id} className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">{barrier.barrier_name}</h4>
              <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">
                {barrier.barrier_type} · {barrier.barrier_code}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <BarrierBadge status={barrier.status as any} size="md" />
              {barrier.confidence != null && (
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  {Math.round(barrier.confidence)}%
                </span>
              )}
            </div>
          </div>

          {barrier.reasoning && (
            <p className="text-[12.5px] text-[var(--color-text-primary)] mb-2 leading-relaxed">{barrier.reasoning}</p>
          )}

          {barrier.evidence?.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[var(--color-border)]">
              {barrier.evidence.map((ev: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11.5px] text-[var(--color-text-secondary)]">
                  <span style={{ color: 'var(--color-primary)' }}>›</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>
          )}

          {barrier.criticality && (
            <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
              Criticality: {barrier.criticality}/5
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── LSR Tab ──────────────────────────────────────────────────────────────────

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
        <Card key={lsr.id} className="p-5">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Shield size={14} style={{ color: 'var(--color-primary)' }} />
                <h4 className="text-[13px] font-bold text-[var(--color-text-primary)]">{lsr.rule_name}</h4>
              </div>
              <div className="text-[10.5px] font-mono text-[var(--color-text-tertiary)]">{lsr.rule_code}</div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {lsr.priority && (
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg"
                  style={{
                    background: lsr.priority === 'PRIMARY' ? 'var(--color-text-primary)' : 'var(--color-surface)',
                    color: lsr.priority === 'PRIMARY' ? 'white' : 'var(--color-text-secondary)',
                  }}
                >
                  {lsr.priority}
                </span>
              )}
              {lsr.confidence != null && (
                <span className="text-[11px] text-[var(--color-text-tertiary)]">{Math.round(lsr.confidence)}%</span>
              )}
            </div>
          </div>

          {lsr.description && (
            <p className="text-[12.5px] text-[var(--color-text-secondary)] mb-2 leading-relaxed">{lsr.description}</p>
          )}

          {lsr.trigger && (
            <div className="text-[11.5px] text-[var(--color-text-secondary)] mb-2">
              <strong>Trigger: </strong>{lsr.trigger}
            </div>
          )}

          {lsr.evidence?.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-[var(--color-border)]">
              {lsr.evidence.map((ev: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11.5px] text-[var(--color-text-secondary)]">
                  <CheckCircle2 size={11} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
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

// ─── Similar Incidents Tab ─────────────────────────────────────────────────────

function SimilarTab({ incident }: { incident: any }) {
  const navigate = useNavigate();
  const similar = incident.similar_incidents || [];
  if (similar.length === 0) {
    return (
      <EmptyState
        title="No similar incidents found"
        description="Similar incidents are identified using semantic vector search"
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
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">{sim.id}</span>
              <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mt-0.5">{sim.title}</h4>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <span
                className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                style={{ background: 'var(--color-surface-strong)', color: 'var(--color-primary)' }}
              >
                {Math.round(sim.similarity_score * 100)}% similar
              </span>
              {sim.sif_score != null && <SIFBadge score={sim.sif_score} classification={sim.sif_classification} />}
            </div>
          </div>
          <div className="text-[11px] text-[var(--color-text-tertiary)]">
            {sim.site_name} · {sim.report_date} · {sim.report_type}
          </div>
          {sim.common_hazards?.length > 0 && (
            <div className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
              Common hazard: {sim.common_hazards.join(', ')}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ─── Actions Tab ──────────────────────────────────────────────────────────────

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

  const recommended = incident.recommended_actions || [];

  const inputCls = 'w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-white text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)]';
  const labelCls = 'text-[11px] text-[var(--color-text-tertiary)] mb-1 block font-medium';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[var(--color-text-primary)]">Actions & Interventions</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-white px-3.5 py-2 rounded-lg transition-colors"
          style={{ background: 'var(--color-text-primary)' }}
        >
          <Plus size={13} /> New Action
        </button>
      </div>

      {/* Recommended Actions */}
      {recommended.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={13} style={{ color: 'var(--color-text-tertiary)' }} />
            <h4 className="text-[11.5px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wide">
              AI Recommended Actions
            </h4>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'var(--color-surface-strong)', color: 'var(--color-primary)' }}
            >
              AI GENERATED
            </span>
          </div>
          <div className="space-y-2">
            {recommended.map((action: string, i: number) => (
              <button
                key={i}
                onClick={() => setForm((f) => ({ ...f, title: action }))}
                className="w-full text-left flex items-start gap-2 p-3 hover:bg-[var(--color-surface)] rounded-xl text-[12.5px] text-[var(--color-text-primary)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all"
              >
                <Plus size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
                <span>{action}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Create form */}
      {showCreate && (
        <Card className="p-5">
          <h4 className="text-[13px] font-bold text-[var(--color-text-primary)] mb-4">Create Action</h4>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Action title…"
                className={inputCls}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Owner</label>
                <input
                  value={form.owner}
                  onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
                  placeholder="Assignee…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as Priority }))}
                  className={inputCls}
                >
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Due Date</label>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setShowCreate(false)}
                className="text-[12px] text-[var(--color-text-secondary)] px-3.5 py-2 hover:bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => createMutation.mutate({ title: form.title, owner: form.owner, priority: form.priority, due_date: form.due_date })}
                disabled={!form.title || createMutation.isPending}
                className="text-[12px] text-white px-3.5 py-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: 'var(--color-text-primary)' }}
              >
                {createMutation.isPending ? 'Creating…' : 'Create Action'}
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
            <Card key={action.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                    {action.id.slice(0, 8)}
                  </div>
                  <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mt-0.5">
                    {action.title}
                  </div>
                  {action.owner && (
                    <div className="text-[11px] text-[var(--color-text-tertiary)]">Owner: {action.owner}</div>
                  )}
                  {action.due_date && (
                    <div className="text-[11px] text-[var(--color-text-tertiary)]">Due: {action.due_date}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <PriorityBadge priority={action.priority} size="xs" />
                  <StatusBadge status={action.status as any} size="xs" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

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
      <Card className="p-5">
        <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3">Add Comment</h3>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Add a note or comment…"
          rows={3}
          className="w-full border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] resize-none text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] bg-white"
        />
        <div className="flex justify-end mt-2.5">
          <button
            onClick={() => commentMutation.mutate()}
            disabled={!commentText.trim() || commentMutation.isPending}
            className="text-[12px] text-white font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            style={{ background: 'var(--color-text-primary)' }}
          >
            {commentMutation.isPending ? 'Posting…' : 'Post Comment'}
          </button>
        </div>
      </Card>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-2">
          {comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[12px] font-bold text-[var(--color-text-primary)]">{comment.author}</span>
                <span className="text-[10.5px] text-[var(--color-text-tertiary)]">
                  {comment.created_at ? new Date(comment.created_at).toLocaleString('en-IN') : ''}
                </span>
              </div>
              <p className="text-[12.5px] text-[var(--color-text-primary)] leading-relaxed">{comment.content}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Activity timeline */}
      {activities.length > 0 && (
        <div>
          <h3 className="text-[12px] font-bold text-[var(--color-text-primary)] mb-3">Activity Timeline</h3>
          <div className="space-y-0">
            {activities.map((entry, i) => (
              <div key={entry.id} className="flex items-start gap-3 text-[12.5px] relative pb-4 last:pb-0">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 z-10 relative"
                    style={{ background: 'var(--color-border-strong)' }}
                  />
                  {i < activities.length - 1 && (
                    <div className="flex-1 w-px mt-1" style={{ background: 'var(--color-border)', minHeight: 24 }} />
                  )}
                </div>
                <div>
                  <span className="font-semibold text-[var(--color-text-primary)]">
                    {entry.event_type.replace(/_/g, ' ')}
                  </span>
                  {entry.actor && (
                    <span className="text-[var(--color-text-tertiary)]"> by {entry.actor}</span>
                  )}
                  {entry.created_at && (
                    <div className="text-[10.5px] text-[var(--color-text-tertiary)] mt-0.5">
                      {new Date(entry.created_at).toLocaleString('en-IN')}
                    </div>
                  )}
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

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useUIStore();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: incident, isLoading, isError, refetch } = useQuery({
    queryKey: ['incident', id],
    queryFn: () => fetchIncident(id!),
    enabled: !!id,
    staleTime: 30000,
  });

  const updateMutation = useMutation({
    mutationFn: (update: { priority?: Priority; status?: any }) =>
      updateIncident(id!, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incident', id] });
      addToast('Updated successfully', 'success');
    },
    onError: () => addToast('Update failed', 'error'),
  });

  if (isLoading) return (
    <div className="flex flex-col h-full bg-[var(--color-surface)] animate-skeleton">
      <div className="bg-white border-b border-[var(--color-border)] px-7 py-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[var(--color-border)]" />
          <div className="h-6 w-64 bg-[var(--color-border)] rounded" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 w-24 bg-[var(--color-surface-strong)] rounded" />
          ))}
        </div>
      </div>
      <div className="px-7 py-3 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-24 bg-[var(--color-border)] rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-7 max-w-[1200px] w-full mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-[400px] bg-white border border-[var(--color-border)] rounded-xl" />
          <div className="h-[400px] bg-white border border-[var(--color-border)] rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (isError || !incident) return <ErrorState message="Incident not found" onRetry={() => refetch()} />;

  const selectCls = 'text-[11.5px] border border-[var(--color-border)] rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] text-[var(--color-text-primary)] cursor-pointer hover:border-[var(--color-border-strong)] transition-colors';

  return (
    <div className="flex flex-col h-full">
      {/* ── Incident Header ────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-7 py-5 border-b border-[var(--color-border)]"
        style={{ background: 'var(--color-surface-elevated)' }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[11.5px] text-[var(--color-text-tertiary)] mb-4">
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={12} /> Incident Board
          </button>
          <span>/</span>
          <span className="font-mono text-[var(--color-text-secondary)]">{incident.id.slice(0, 16)}</span>
        </div>

        {/* Title + metadata */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-[18px] font-bold text-[var(--color-text-primary)] mb-2 leading-snug">
              {incident.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">{incident.id}</span>
              <PriorityBadge priority={incident.priority} size="sm" />
              <StatusBadge status={incident.status} size="sm" />
              <SIFBadge score={incident.sif_score} classification={incident.sif_classification} />
              <ExposureBadge status={incident.exposure_status} />
              {incident.confidence != null && (
                <span className="text-[11px] text-[var(--color-text-tertiary)]">
                  {Math.round(incident.confidence)}% confidence
                </span>
              )}
            </div>
            <div className="mt-2 flex items-center gap-4 text-[11.5px] text-[var(--color-text-tertiary)] flex-wrap">
              {incident.site_name && <span>📍 {incident.site_name}</span>}
              {incident.department && <span>🏢 {incident.department}</span>}
              {incident.activity && <span>⚙ {incident.activity}</span>}
              {incident.report_date && <span>📅 {incident.report_date}</span>}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={incident.priority}
              onChange={(e) => updateMutation.mutate({ priority: e.target.value as Priority })}
              className={selectCls}
            >
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
            <select
              value={incident.status}
              onChange={(e) => updateMutation.mutate({ status: e.target.value })}
              className={selectCls}
            >
              <option value="OPEN">OPEN</option>
              <option value="INVESTIGATING">INVESTIGATING</option>
              <option value="ACTION_REQUIRED">ACTION REQUIRED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 border-b border-[var(--color-border)] px-7"
        style={{ background: 'var(--color-surface-elevated)' }}
      >
        <div className="flex gap-0 overflow-x-auto">
          {TABS.map((tab) => {
            const count =
              tab.id === 'barriers'
                ? incident.barriers.length
                : tab.id === 'lsr'
                ? incident.life_saving_rules.length
                : tab.id === 'similar'
                ? incident.similar_incidents.length
                : 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'px-4 py-3 text-[12px] font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5',
                  activeTab === tab.id
                    ? 'border-[var(--color-primary)] text-[var(--color-text-primary)]'
                    : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)]'
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
                      color: activeTab === tab.id ? 'white' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-auto p-7"
        style={{ background: 'var(--color-surface)' }}
      >
        {activeTab === 'overview' && <OverviewTab incident={incident} />}
        {activeTab === 'analysis' && <AIAnalysisTab incident={incident} />}
        {activeTab === 'sif' && <SIFAssessmentTab incident={incident} />}
        {activeTab === 'escalation' && <EscalationTab incident={incident} />}
        {activeTab === 'barriers' && <BarriersTab incident={incident} />}
        {activeTab === 'lsr' && <LSRTab incident={incident} />}
        {activeTab === 'similar' && <SimilarTab incident={incident} />}
        {activeTab === 'actions' && <ActionsTab reportId={id!} incident={incident} />}
      </div>
    </div>
  );
}
