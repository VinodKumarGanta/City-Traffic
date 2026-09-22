import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("NEON_DATABASE_URL")
if not db_url:
    print("ERROR: NEON_DATABASE_URL not set in environment or .env")
    exit(1)

print(f"Connecting to Neon PostgreSQL...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

migration_file = os.path.join(os.path.dirname(__file__), "migrations", "002_production_full_schema.sql")
print(f"Executing migration: {migration_file}...")

with open(migration_file, "r", encoding="utf-8") as f:
    sql = f.read()

cur.execute(sql)
print("Migration executed successfully!")

# Verify table counts
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;")
tables = [r[0] for r in cur.fetchall()]
print("\n--- Live Neon PostgreSQL Tables ---")
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    cnt = cur.fetchone()[0]
    print(f"  {t:28} : {cnt} rows")

cur.close()
conn.close()
print("\nDatabase migration completed & verified.")
