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

customers = pd.read_csv(
    PROCESSED_DIR / "dim_customer.csv",
    dtype={"user_id": "string"}
)

merchants = pd.read_csv(
    PROCESSED_DIR / "dim_merchant.csv",
    dtype={"merchant_id": "string"}
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    dtype={
        "complaint_id": "string",
        "txn_id": "string",
        "user_id": "string",
        "merchant_id": "string"
    }
)


for df in [transactions, customers, merchants, chargebacks]:
    for column in ["user_id", "merchant_id", "txn_id"]:
        if column in df.columns:
            df[column] = normalize_id(df[column])


print("=" * 60)
print("FINAL DATA QUALITY REPORT")
print("=" * 60)


print("\n1. TRANSACTIONS")
print("-" * 60)

print("Rows:", len(transactions))
print("Unique txn_id:", transactions["txn_id"].nunique())
print("Duplicate txn_id:", transactions["txn_id"].duplicated().sum())
print("Missing txn_id:", transactions["txn_id"].isna().sum())
print("Missing user_id:", transactions["user_id"].isna().sum())
print("Missing merchant_id:", transactions["merchant_id"].isna().sum())
print("Missing amount:", transactions["amount"].isna().sum())
print("Missing UTR:", transactions["utr"].isna().sum())
print("Missing MCC:", transactions["mcc"].isna().sum())


print("\n2. CUSTOMERS")
print("-" * 60)

print("Rows:", len(customers))
print("Unique user_id:", customers["user_id"].nunique())
print("Duplicate user_id:", customers["user_id"].duplicated().sum())
print("Missing user_id:", customers["user_id"].isna().sum())


print("\n3. MERCHANTS")
print("-" * 60)

print("Rows:", len(merchants))
print("Unique merchant_id:", merchants["merchant_id"].nunique())
print("Duplicate merchant_id:", merchants["merchant_id"].duplicated().sum())
print("Missing merchant_id:", merchants["merchant_id"].isna().sum())


print("\n4. CHARGEBACKS")
print("-" * 60)

print("Rows:", len(chargebacks))
print("Unique complaint_id:", chargebacks["complaint_id"].nunique())
print("Duplicate complaint_id:", chargebacks["complaint_id"].duplicated().sum())
print("Missing complaint_id:", chargebacks["complaint_id"].isna().sum())
print("Missing txn_id:", chargebacks["txn_id"].isna().sum())
print("Missing user_id:", chargebacks["user_id"].isna().sum())
print("Missing merchant_id:", chargebacks["merchant_id"].isna().sum())
print("Missing disputed_amount:", chargebacks["disputed_amount"].isna().sum())


customer_ids = set(customers["user_id"].dropna())
transaction_users = set(transactions["user_id"].dropna())
chargeback_users = set(chargebacks["user_id"].dropna())

merchant_ids = set(merchants["merchant_id"].dropna())
transaction_merchants = set(transactions["merchant_id"].dropna())
chargeback_merchants = set(chargebacks["merchant_id"].dropna())

transaction_ids = set(transactions["txn_id"].dropna())
chargeback_txns = set(chargebacks["txn_id"].dropna())


print("\n5. CUSTOMER REFERENTIAL INTEGRITY")
print("-" * 60)

print(
    "Transaction users missing in customer dimension:",
    len(transaction_users - customer_ids)
)

print(
    "Chargeback users missing in customer dimension:",
    len(chargeback_users - customer_ids)
)


print("\n6. MERCHANT REFERENTIAL INTEGRITY")
print("-" * 60)

print(
    "Transaction merchants missing in merchant dimension:",
    len(transaction_merchants - merchant_ids)
)

print(
    "Chargeback merchants missing in merchant dimension:",
    len(chargeback_merchants - merchant_ids)
)


print("\n7. CHARGEBACK → TRANSACTION")
print("-" * 60)

print(
    "Chargeback txn IDs:",
    len(chargeback_txns)
)

print(
    "Chargeback txn IDs missing in transactions:",
    len(chargeback_txns - transaction_ids)
)


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

user_mismatch = (
    matched["user_id"] != matched["transaction_user_id"]
)

merchant_mismatch = (
    matched["merchant_id"] != matched["transaction_merchant_id"]
)


print(
    "Chargebacks with matching transaction:",
    len(matched)
)

print(
    "User ID mismatches:",
    user_mismatch.sum()
)

print(
    "Merchant ID mismatches:",
    merchant_mismatch.sum()
)


print("\n8. FINAL STATUS")
print("-" * 60)

print("Data cleaning: COMPLETE")
print("Single-table validation: COMPLETE")
print("Customer dimension: COMPLETE")
print("Merchant dimension: COMPLETE")
print("Foreign-key validation: COMPLETE")
print("Chargeback consistency validation: COMPLETE")

print("\nReport generation complete.")