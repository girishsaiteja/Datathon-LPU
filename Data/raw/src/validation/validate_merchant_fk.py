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

merchants = pd.read_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv",
    dtype={"merchant_id": "string"}
)

transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv",
    dtype={"merchant_id": "string"}
)

merchants["merchant_id"] = normalize_id(
    merchants["merchant_id"]
)

transactions["merchant_id"] = normalize_id(
    transactions["merchant_id"]
)

merchant_ids = set(
    merchants["merchant_id"].dropna()
)

txn_ids = set(
    transactions["merchant_id"].dropna()
)

missing = txn_ids - merchant_ids

print("Unique IDs in cleaned Merchant Master:", len(merchant_ids))
print("Unique IDs in Transactions:", len(txn_ids))
print("Transaction IDs missing from cleaned Merchant Master:", len(missing))

print("\nSample missing IDs:")
print(
    pd.Series(sorted(missing))
    .head(50)
    .to_string(index=False)
)