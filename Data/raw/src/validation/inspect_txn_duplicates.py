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
    dtype={
        "txn_id": "string",
        "user_id": "string",
        "merchant_id": "string"
    }
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    dtype={
        "txn_id": "string",
        "user_id": "string",
        "merchant_id": "string"
    }
)

for df in [transactions, chargebacks]:
    df["txn_id"] = normalize_id(df["txn_id"])
    df["user_id"] = normalize_id(df["user_id"])
    df["merchant_id"] = normalize_id(df["merchant_id"])


txn_counts = transactions["txn_id"].value_counts()

duplicate_txn_ids = txn_counts[txn_counts > 1]


print("Total transaction rows:", len(transactions))
print("Unique transaction IDs:", transactions["txn_id"].nunique())
print("Duplicate transaction IDs:", len(duplicate_txn_ids))
print("Rows belonging to duplicate transaction IDs:",
      duplicate_txn_ids.sum())


print()
print("Sample duplicate transaction IDs:")

for txn_id in duplicate_txn_ids.index[:10]:
    print()
    print("TXN:", txn_id)

    print(
        transactions[
            transactions["txn_id"] == txn_id
        ][["txn_id", "user_id", "merchant_id"]].to_string(index=False)
    )