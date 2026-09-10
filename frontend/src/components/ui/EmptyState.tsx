import type { ReactNode } from 'react';

interface EmptyStateProps {
 title?: string;
 description?: string;
 icon?: ReactNode;
 action?: ReactNode;
}

export function EmptyState({
 title = 'No data found',
 description = 'There is nothing to display here.',
 icon,
 action,
}: EmptyStateProps) {
 return (
 <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
 {icon && (
 <div className="mb-3 text-gray-300">{icon}</div>
 )}
 <h3 className="text-sm font-semibold text-mute mb-1">{title}</h3>
 <p className="text-xs text-mute max-w-xs">{description}</p>
 {action && <div className="mt-4">{action}</div>}
 </div>
 );
}
