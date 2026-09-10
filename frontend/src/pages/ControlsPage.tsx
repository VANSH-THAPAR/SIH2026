import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBarriers, fetchLSRs } from '@/services/api';
import { PageLoading, ErrorState, Card } from '@/components/ui/Toast';
import { Shield, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

export function ControlsPage() {
 const [activeTab, setActiveTab] = useState<'barriers' | 'lsr'>('barriers');

 const { data: barriers, isLoading: barriersLoading } = useQuery({
 queryKey: ['barriers'],
 queryFn: fetchBarriers,
 });

 const { data: lsrs, isLoading: lsrsLoading } = useQuery({
 queryKey: ['lsr'],
 queryFn: fetchLSRs,
 });

 if (barriersLoading || lsrsLoading) return <PageLoading />;
 if (!barriers || !lsrs) return <ErrorState message="Failed to load controls data" />;

 return (
 <div className="flex flex-col h-full p-6 max-w-screen-2xl">
 <div className="mb-6">
 <h1 className="text-xl font-bold text-ink">Controls Intelligence</h1>
 <p className="text-sm text-mute mt-0.5">Critical barriers and Life-Saving Rules performance</p>
 </div>

 <div className="flex gap-4 border-b border-hairline mb-6">
 <button
 onClick={() => setActiveTab('barriers')}
 className={clsx(
 'px-4 py-2 font-medium text-sm border-b-2',
 activeTab === 'barriers' ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-gray-700'
 )}
 >
 Critical Barriers
 </button>
 <button
 onClick={() => setActiveTab('lsr')}
 className={clsx(
 'px-4 py-2 font-medium text-sm border-b-2',
 activeTab === 'lsr' ? 'border-ink text-ink' : 'border-transparent text-mute hover:text-gray-700'
 )}
 >
 Life-Saving Rules
 </button>
 </div>

 <div className="flex-1 overflow-auto">
 {activeTab === 'barriers' && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {barriers.map(barrier => {
 const failureRate = barrier.incident_count > 0 
 ? (barrier.failed_count / barrier.incident_count) * 100 
 : 0;

 return (
 <Card key={barrier.barrier_id} className="p-4">
 <div className="flex justify-between items-start mb-2">
 <div>
 <h3 className="font-semibold text-ink">{barrier.barrier_name}</h3>
 <div className="text-xs text-mute">{barrier.barrier_code} · {barrier.barrier_type}</div>
 </div>
 {failureRate > 25 && <AlertTriangle size={16} className="text-orange-500" />}
 </div>
 <p className="text-sm text-mute mb-4 line-clamp-2">{barrier.description}</p>
 
 <div className="grid grid-cols-3 gap-2 pt-4 border-t border-hairline">
 <div>
 <div className="text-xs text-mute">Mappings</div>
 <div className="font-semibold text-ink">{barrier.incident_count}</div>
 </div>
 <div>
 <div className="text-xs text-mute">Failed</div>
 <div className="font-semibold text-red-600">{barrier.failed_count}</div>
 </div>
 <div>
 <div className="text-xs text-mute">Failure Rate</div>
 <div className={clsx("font-semibold", failureRate > 25 ? "text-orange-600" : "text-ink")}>
 {failureRate.toFixed(1)}%
 </div>
 </div>
 </div>
 </Card>
 );
 })}
 </div>
 )}

 {activeTab === 'lsr' && (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
 {lsrs.map(lsr => (
 <Card key={lsr.rule_id} className="p-4">
 <div className="flex items-center gap-2 mb-2">
 <Shield size={16} className="text-ink" />
 <h3 className="font-semibold text-ink">{lsr.rule_name}</h3>
 </div>
 <div className="text-xs text-mute mb-2">{lsr.rule_code}</div>
 <p className="text-sm text-mute mb-4 line-clamp-2">{lsr.description}</p>
 
 <div className="pt-4 border-t border-hairline">
 <div className="text-xs text-mute">Incident Mappings</div>
 <div className="font-semibold text-ink">{lsr.incident_count}</div>
 </div>
 </Card>
 ))}
 </div>
 )}
 </div>
 </div>
 );
}
