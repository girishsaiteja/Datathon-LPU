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


matched = chargebacks.merge(
    transactions[
        ["txn_id", "user_id", "merchant_id"]
    ],
    on="txn_id",
    how="inner",
    suffixes=("_chargeback", "_transaction")
)


user_mismatch = (
    matched["user_id_chargeback"]
    != matched["user_id_transaction"]
)

merchant_mismatch = (
    matched["merchant_id_chargeback"]
    != matched["merchant_id_transaction"]
)


print("Matched chargeback transactions:", len(matched))
print("User ID mismatches:", user_mismatch.sum())
print("Merchant ID mismatches:", merchant_mismatch.sum())