from app.db.database import SessionLocal
from app.models.models import Barrier, LifeSavingRule
import json

db = SessionLocal()
barriers = [{"id": b.barrier_id, "name": b.barrier_name, "code": b.barrier_code} for b in db.query(Barrier).all()]
rules = [{"id": r.rule_id, "name": r.rule_name, "code": r.rule_code} for r in db.query(LifeSavingRule).all()]
print(json.dumps({"barriers": barriers, "rules": rules}, indent=2))
db.close()
