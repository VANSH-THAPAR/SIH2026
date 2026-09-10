from app.db.database import SessionLocal
from app.models.models import Barrier, LifeSavingRule

db = SessionLocal()
print("Barriers:", [b.barrier_id for b in db.query(Barrier).all()])
print("Rules:", [r.rule_id for r in db.query(LifeSavingRule).all()])
db.close()
