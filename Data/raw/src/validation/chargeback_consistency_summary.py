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


transaction_lookup = transactions.set_index("txn_id")[
    ["user_id", "merchant_id"]
]


matched = chargebacks[
    chargebacks["txn_id"].isin(transaction_lookup.index)
].copy()


matched["transaction_user_id"] = matched["txn_id"].map(
    transaction_lookup["user_id"]
)

matched["transaction_merchant_id"] = matched["txn_id"].map(
    transaction_lookup["merchant_id"]
)


user_match = (
    matched["user_id"] ==
    matched["transaction_user_id"]
)

merchant_match = (
    matched["merchant_id"] ==
    matched["transaction_merchant_id"]
)


print("=== CHARGEBACK CONSISTENCY SUMMARY ===")
print()

print("Total chargeback rows:", len(chargebacks))
print("Chargebacks with txn_id:", chargebacks["txn_id"].notna().sum())
print("Chargebacks with matching transaction:", len(matched))
print("Chargebacks with transaction not found:",
      chargebacks["txn_id"].notna().sum() - len(matched))

print()

print("User ID matches:", user_match.sum())
print("User ID mismatches:", (~user_match).sum())

print()

print("Merchant ID matches:", merchant_match.sum())
print("Merchant ID mismatches:", (~merchant_match).sum())