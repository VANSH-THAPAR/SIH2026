import { useQuery } from '@tanstack/react-query';
import { fetchIncidents, fetchDashboardKPIs } from '@/services/api';
import { PageLoading, ErrorState, EmptyState } from '@/components/ui/Toast';
import { PriorityBadge, SIFBadge, ExposureBadge } from '@/components/ui/Badge';
import { Link } from 'react-router-dom';

export function SIFIntelligence() {
 const { data: kpis, isLoading: kpiLoading } = useQuery({
 queryKey: ['dashboard', 'summary'],
 queryFn: fetchDashboardKPIs,
 });

 const { data: incidents, isLoading: incidentsLoading, error } = useQuery({
 queryKey: ['sif-incidents'],
 queryFn: () => fetchIncidents({ sif_only: true, page_size: 100 }),
 });

 if (kpiLoading || incidentsLoading) return <PageLoading />;
 if (error || !incidents) return <ErrorState message="Failed to load SIF intelligence" />;

 return (
 <div className="flex flex-col h-full p-6 max-w-screen-2xl">
 <div className="mb-6">
 <h1 className="text-xl font-bold text-ink">SIF Intelligence</h1>
 <p className="text-sm text-mute mt-0.5">Deep dive into Serious Injury and Fatality potential incidents</p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
 <div className="bg-canvas p-4 rounded-none border border-hairline">
 <div className="text-xs text-mute font-medium mb-1">Total SIF Potential</div>
 <div className="text-2xl font-bold text-red-700">{kpis?.sif_potential_count || 0}</div>
 </div>
 <div className="bg-canvas p-4 rounded-none border border-hairline">
 <div className="text-xs text-mute font-medium mb-1">Avg SIF Score</div>
 <div className="text-2xl font-bold text-ink">{kpis?.avg_sif_score || 0}</div>
 </div>
 <div className="bg-canvas p-4 rounded-none border border-hairline">
 <div className="text-xs text-mute font-medium mb-1">Critical Priority</div>
 <div className="text-2xl font-bold text-orange-600">{kpis?.critical_count || 0}</div>
 </div>
 <div className="bg-canvas p-4 rounded-none border border-hairline">
 <div className="text-xs text-mute font-medium mb-1">Documented Exposure</div>
 <div className="text-2xl font-bold text-purple-600">{kpis?.documented_exposure || 0}</div>
 </div>
 </div>

 <div className="bg-canvas border border-hairline rounded-none overflow-hidden flex-1 flex flex-col">
 <div className="px-4 py-3 border-b border-hairline bg-soft-cloud">
 <h2 className="text-sm font-semibold text-gray-700">SIF Potential Incidents</h2>
 </div>
 <div className="overflow-x-auto flex-1">
 {incidents.items.length === 0 ? (
 <EmptyState title="No SIF incidents found" />
 ) : (
 <table className="w-full text-sm">
 <thead className="bg-canvas sticky top-0">
 <tr className="border-b border-hairline">
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">ID</th>
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">Incident</th>
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">Score</th>
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">Exposure</th>
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">Priority</th>
 <th className="px-4 py-2 text-left text-xs font-semibold text-mute">Site</th>
 </tr>
 </thead>
 <tbody>
 {incidents.items.map((inc) => (
 <tr key={inc.id} className="border-b border-hairline hover:bg-soft-cloud">
 <td className="px-4 py-3 font-mono text-xs text-ink">
 <Link to={`/incidents/${inc.id}`} className="hover:underline">{inc.id}</Link>
 </td>
 <td className="px-4 py-3">
 <div className="font-medium text-ink line-clamp-1">{inc.title}</div>
 <div className="text-xs text-mute truncate max-w-sm mt-0.5">{inc.hazard}</div>
 </td>
 <td className="px-4 py-3">
 <SIFBadge score={inc.sif_score} classification={inc.sif_classification} />
 </td>
 <td className="px-4 py-3">
 <ExposureBadge status={inc.exposure_status} />
 </td>
 <td className="px-4 py-3">
 <PriorityBadge priority={inc.priority} />
 </td>
 <td className="px-4 py-3 text-mute">{inc.site_name}</td>
 </tr>
 ))}
 </tbody>
 </table>
 )}
 </div>
 </div>
 </div>
 );
}
