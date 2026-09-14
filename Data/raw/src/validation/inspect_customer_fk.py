from pathlib import Path
import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"


def normalize_id(series):
    return (
        series.astype("string")
        .str.strip()
        .str.upper()
        .str.replace(r"[\s_-]", "", regex=True)
    )


customers = pd.read_csv(
    PROCESSED_DIR / "dim_customer.csv",
    dtype={"user_id": "string"}
)

transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv",
    dtype={"user_id": "string"}
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    dtype={"user_id": "string"}
)

customers["user_id"] = normalize_id(customers["user_id"])
transactions["user_id"] = normalize_id(transactions["user_id"])
chargebacks["user_id"] = normalize_id(chargebacks["user_id"])


customer_ids = set(customers["user_id"].dropna())
transaction_ids = set(transactions["user_id"].dropna())
chargeback_ids = set(chargebacks["user_id"].dropna())


transaction_missing = transaction_ids - customer_ids
chargeback_missing = chargeback_ids - customer_ids


print("=== CUSTOMER FK DIAGNOSTIC ===")
print()

print("Sample unmatched transaction user IDs:")
for user_id in sorted(transaction_missing)[:20]:
    print(user_id)

print()

print("Sample unmatched chargeback user IDs:")
for user_id in sorted(chargeback_missing)[:20]:
    print(user_id)