import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
 title?: string;
 description?: string;
 onRetry?: () => void;
}

export function ErrorState({
 title = 'Failed to load data',
 description = 'An error occurred while fetching data. Please try again.',
 onRetry,
}: ErrorStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
 <AlertTriangle className="w-8 h-8 text-red-400 mb-3" />
 <h3 className="text-sm font-semibold text-gray-700 mb-1">{title}</h3>
 <p className="text-xs text-mute max-w-xs mb-4">{description}</p>
 {onRetry && (
 <button
 onClick={onRetry}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-canvas border border-hairline rounded hover:bg-soft-cloud text-gray-700"
 >
 <RefreshCw className="w-3 h-3" />
 Retry
 </button>
 )}
 </div>
 );
}
