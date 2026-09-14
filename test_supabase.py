from pathlib import Path
import os
import psycopg
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
ENV_FILE = BASE_DIR / ".env"

load_dotenv(ENV_FILE)

DB_URL = os.getenv("SUPABASE_DB_URL")

if not DB_URL:
    raise ValueError("SUPABASE_DB_URL is missing from .env")

print("Connecting to Supabase...")

try:
    with psycopg.connect(DB_URL, connect_timeout=10) as conn:
        print("Supabase connection successful!")

        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            print("PostgreSQL connection confirmed.")

except Exception as e:
    print("Connection failed:")
    print(type(e).__name__)
    print(e)