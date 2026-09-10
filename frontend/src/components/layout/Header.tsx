import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, X } from 'lucide-react';

export function Header() {
 const [localSearch, setLocalSearch] = useState('');
 const [notifOpen, setNotifOpen] = useState(false);
 const navigate = useNavigate();

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 if (localSearch.trim()) {
 navigate(`/incidents?search=${encodeURIComponent(localSearch.trim())}`);
 setLocalSearch('');
 }
 };

 return (
 <header
 className="flex items-center justify-between px-4 border-b border-hairline bg-canvas"
 style={{ height: 48, flexShrink: 0 }}
 >
 {/* Left: Brand */}
 <div className="flex items-center gap-3">
 <span className="text-sm font-bold text-ink">OIL SIF Intelligence</span>
 <span className="text-xs text-mute hidden md:block">HSSE SIF Precursor Platform</span>
 </div>

 {/* Center: Search */}
 <form onSubmit={handleSearch} className="flex-1 max-w-md mx-6">
 <div className="relative">
 <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mute" />
 <input
 type="text"
 value={localSearch}
 onChange={(e) => setLocalSearch(e.target.value)}
 placeholder="Search incidents, hazards, sites..."
 className="w-full pl-8 pr-3 py-1.5 text-xs border border-hairline rounded bg-soft-cloud focus:bg-canvas focus:outline-none focus:ring-1 focus:ring-ink focus:border-zinc-500 placeholder-gray-400"
 />
 {localSearch && (
 <button
 type="button"
 onClick={() => setLocalSearch('')}
 className="absolute right-2 top-1/2 -translate-y-1/2 text-mute hover:text-mute"
 >
 <X className="w-3 h-3" />
 </button>
 )}
 </div>
 </form>

 {/* Right: Actions */}
 <div className="flex items-center gap-2">
 <div className="relative">
 <button
 onClick={() => setNotifOpen(!notifOpen)}
 className="relative flex items-center justify-center w-7 h-7 rounded hover:bg-soft-cloud text-mute"
 >
 <Bell className="w-4 h-4" />
 <span
 className="absolute top-1 right-1 rounded-full bg-red-500"
 style={{ width: 6, height: 6 }}
 />
 </button>
 {notifOpen && (
 <>
 <div
 className="fixed inset-0 z-40"
 onClick={() => setNotifOpen(false)}
 />
 <div className="absolute right-0 top-9 w-72 bg-canvas border border-hairline rounded-none z-50">
 <div className="px-3 py-2 border-b border-hairline">
 <h3 className="text-xs font-semibold text-gray-700">Notifications</h3>
 </div>
 <div className="p-3">
 <p className="text-xs text-mute text-center py-4">No new notifications</p>
 </div>
 </div>
 </>
 )}
 </div>

 <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-soft-cloud">
 <div
 className="flex items-center justify-center rounded-full text-canvas text-[10px] font-bold"
 style={{ width: 22, height: 22, background: '#1B3A6B' }}
 >
 OP
 </div>
 <span className="text-xs text-gray-700 font-medium">Admin</span>
 <ChevronDown className="w-3 h-3 text-mute" />
 </button>
 </div>
 </header>
 );
}
