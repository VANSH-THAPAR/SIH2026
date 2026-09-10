import { EmptyState } from '@/components/ui/Toast';
import { Settings } from 'lucide-react';

export function AdminPage() {
  return (
    <div className="flex-1 p-6 h-full flex flex-col items-center justify-center">
      <EmptyState 
        title="Administration" 
        description="User management, API configuration, and system settings are restricted to Admin roles." 
        icon={<Settings size={48} className="text-gray-300" />}
      />
    </div>
  );
}
