from pathlib import Path
import os
import pandas as pd
import psycopg
from dotenv import load_dotenv

CURRENT_FILE = Path(__file__).resolve()

RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

ENV_FILE = CURRENT_FILE.parents[4] / ".env"
load_dotenv(ENV_FILE)

DB_URL = os.getenv("SUPABASE_DB_URL")

if not DB_URL:
    raise ValueError(f"SUPABASE_DB_URL not found in {ENV_FILE}")

tables = {
    "dim_customer": "dim_customer.csv",
    "dim_merchant": "dim_merchant.csv",
    "fact_transactions": "fact_transactions.csv",
    "fact_chargebacks": "fact_chargebacks.csv"
}

with psycopg.connect(
    DB_URL,
    connect_timeout=15,
    prepare_threshold=None
) as conn:

    for table, filename in tables.items():

        file_path = PROCESSED_DIR / filename

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        df = pd.read_csv(file_path)

        if table == "dim_merchant" and "merchant_key" in df.columns:
            df = df.drop(columns=["merchant_key"])

        columns = list(df.columns)

        column_names = ", ".join(
            f'"{column}"' for column in columns
        )

        placeholders = ", ".join(
            ["%s"] * len(columns)
        )

        query = f"""
            INSERT INTO datathon.{table}
            ({column_names})
            VALUES ({placeholders})
        """

        cur = conn.cursor()

        cur.execute(
            f"TRUNCATE TABLE datathon.{table} CASCADE"
        )

        rows = []

        for row in df.itertuples(index=False, name=None):
            rows.append([
                None if pd.isna(value) else value
                for value in row
            ])

        cur.executemany(query, rows)

        conn.commit()

        cur.close()

        print(f"{table}: {len(df)} rows loaded")

print("All tables loaded successfully.")