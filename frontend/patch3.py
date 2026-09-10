import os
import re

path = 'src/pages/IncidentBoard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useDroppable to import
content = content.replace('closestCenter,', 'closestCenter,\n  useDroppable,')

# Add useDroppable to KanbanColumn
replacement = """function KanbanColumn({ priority, incidents, onClickIncident }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: priority,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-soft-cloud border border-hairline rounded-none overflow-hidden"
      style={{ minWidth: 220, maxWidth: 260, flex: '1 1 220px' }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2 bg-canvas border-b border-hairline">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-ink">{priority}</span>
        </div>
        <span className="text-[11px] font-semibold rounded-full px-2 py-0.5 bg-ink text-canvas">
          {incidents.length}
        </span>
      </div>"""

content = re.sub(
    r'function KanbanColumn\(\{ priority, incidents, onClickIncident \}: KanbanColumnProps\) \{.*?<div className="flex items-center gap-2">\s*<div className="w-2 h-2 rounded-full" style=\{\{ background: COLUMN_COLORS\[priority\] \}\} />\s*<span className="text-xs font-bold" style=\{\{ color: COLUMN_COLORS\[priority\] \}\}>\s*\{priority\}\s*</span>\s*</div>\s*<span\s*className="text-\[11px\] font-semibold rounded-full px-2 py-0\.5 text-canvas"\s*style=\{\{ background: COLUMN_COLORS\[priority\] \}\}\s*>\s*\{incidents.length\}\s*</span>\s*</div>',
    replacement,
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
