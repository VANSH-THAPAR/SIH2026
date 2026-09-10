export function SkeletonCard() {
 return (
 <div className="bg-canvas border border-hairline rounded-none p-3 animate-pulse">
 <div className="flex items-center justify-between mb-2">
 <div className="h-3 bg-gray-200 rounded w-20"></div>
 <div className="h-4 bg-gray-200 rounded w-12"></div>
 </div>
 <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
 <div className="h-3 bg-gray-200 rounded w-3/4 mb-3"></div>
 <div className="flex gap-1">
 <div className="h-4 bg-gray-200 rounded w-16"></div>
 <div className="h-4 bg-gray-200 rounded w-12"></div>
 </div>
 </div>
 );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
 return (
 <div className="animate-pulse">
 {Array.from({ length: rows }).map((_, i) => (
 <div key={i} className="flex gap-4 py-3 border-b border-hairline last:border-0">
 <div className="h-3 bg-gray-200 rounded w-24"></div>
 <div className="h-3 bg-gray-200 rounded flex-1"></div>
 <div className="h-3 bg-gray-200 rounded w-16"></div>
 <div className="h-3 bg-gray-200 rounded w-12"></div>
 </div>
 ))}
 </div>
 );
}
