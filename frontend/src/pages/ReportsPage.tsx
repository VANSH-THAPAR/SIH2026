import { EmptyState } from '@/components/ui/Toast';
import { FileText } from 'lucide-react';

export function ReportsPage() {
 return (
 <div className="flex-1 p-6 h-full flex flex-col items-center justify-center">
 <EmptyState 
 title="Reports Module" 
 description="Automated PDF generation and scheduled reporting is coming in v1.1." 
 icon={<FileText size={48} className="text-gray-300" />}
 />
 </div>
 );
}
