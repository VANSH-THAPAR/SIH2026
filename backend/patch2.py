import os

path = 'app/schemas/schemas.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('incidents: List[IncidentSummary]', 'items: List[IncidentSummary]')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

path2 = 'app/services/incident_service.py'
with open(path2, 'r', encoding='utf-8') as f:
    content2 = f.read()
content2 = content2.replace('"incidents": summaries', '"items": summaries')
content2 = content2.replace("'incidents': summaries", "'items': summaries")
with open(path2, 'w', encoding='utf-8') as f:
    f.write(content2)
