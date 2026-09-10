from app.db.database import SessionLocal
from sqlalchemy import text

db = SessionLocal()
res = db.execute(text("SELECT count(*) FROM report_embeddings WHERE report_id='R00463'")).scalar()
print("Embeddings:", res)
db.close()
