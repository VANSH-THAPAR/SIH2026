import { useUIStore } from '@/store/uiStore';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const TOAST_STYLES = {
  success: { bg: 'bg-green-50 border-green-200', icon: CheckCircle, iconColor: 'text-green-500', text: 'text-green-800' },
  error: { bg: 'bg-red-50 border-red-200', icon: AlertCircle, iconColor: 'text-red-500', text: 'text-red-800' },
  info: { bg: 'bg-blue-50 border-blue-200', icon: Info, iconColor: 'text-blue-500', text: 'text-blue-800' },
  warning: { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', text: 'text-amber-800' },
};

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 max-w-sm">
      {toasts.map((toast) => {
        const { bg, icon: Icon, iconColor, text } = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            className={clsx('flex items-start gap-3 p-3 border rounded-lg shadow-md', bg)}
          >
            <Icon size={16} className={clsx('shrink-0 mt-0.5', iconColor)} />
            <span className={clsx('text-sm flex-1', text)}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// LoadingSpinner
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return (
    <div className="flex items-center justify-center p-4">
      <div className={clsx('border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin', sizeClass)} />
    </div>
  );
}

// PageLoading
export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  );
}

// EmptyState
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-600 mb-1">{title}</h3>
      {description && <p className="text-xs text-gray-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ErrorState
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle size={32} className="text-red-300 mb-3" />
      <h3 className="text-sm font-semibold text-gray-600 mb-1">{message}</h3>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// SkeletonCard  
export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded p-3 animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="flex gap-2">
        <div className="h-4 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-12" />
      </div>
    </div>
  );
}

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 rounded-md',
        onClick && 'cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
