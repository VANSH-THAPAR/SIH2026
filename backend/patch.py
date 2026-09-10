import os
import re

path = 'app/services/incident_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """from sqlalchemy.exc import IntegrityError

def _get_or_create_meta(db: Session, report_id: str, sif_score: Optional[float] = None) -> IncidentMeta:
    meta = db.query(IncidentMeta).filter(IncidentMeta.report_id == report_id).first()
    if not meta:
        try:
            priority = calculate_priority(sif_score)
            meta = IncidentMeta(
                report_id=report_id,
                priority=priority,
                status='OPEN',
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(meta)
            db.commit()
            db.refresh(meta)
        except IntegrityError:
            db.rollback()
            meta = db.query(IncidentMeta).filter(IncidentMeta.report_id == report_id).first()
    return meta"""

content = re.sub(
    r'def _get_or_create_meta\(.*?return meta',
    replacement,
    content,
    flags=re.DOTALL
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
