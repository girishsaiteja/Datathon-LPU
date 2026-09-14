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


transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv",
    dtype={"txn_id": "string"}
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    dtype={"txn_id": "string"}
)


transactions["txn_id"] = normalize_id(transactions["txn_id"])
chargebacks["txn_id"] = normalize_id(chargebacks["txn_id"])


transaction_ids = set(
    transactions["txn_id"].dropna()
)

chargeback_ids = set(
    chargebacks["txn_id"].dropna()
)


chargeback_missing = chargeback_ids - transaction_ids


print("Unique transaction IDs:", len(transaction_ids))
print("Unique chargeback transaction IDs:", len(chargeback_ids))
print("Chargeback transaction IDs missing:", len(chargeback_missing))