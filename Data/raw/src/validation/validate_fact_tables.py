from pathlib import Path
import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"


transactions = pd.read_csv(
    PROCESSED_DIR / "fact_transactions.csv"
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "fact_chargebacks.csv"
)


print("=" * 60)
print("FACT TABLE VALIDATION")
print("=" * 60)

print("\nFACT TRANSACTIONS")
print("-" * 60)

print("Rows:", len(transactions))
print("Unique txn_id:", transactions["txn_id"].nunique())
print(
    "Duplicate txn_id:",
    transactions["txn_id"].duplicated().sum()
)

print("\nCustomer Match Status:")
print(
    transactions["customer_match_status"]
    .value_counts(dropna=False)
)

print("\nMerchant Match Status:")
print(
    transactions["merchant_match_status"]
    .value_counts(dropna=False)
)


print("\nFACT CHARGEBACKS")
print("-" * 60)

print("Rows:", len(chargebacks))
print("Unique complaint_id:", chargebacks["complaint_id"].nunique())
print(
    "Duplicate complaint_id:",
    chargebacks["complaint_id"].duplicated().sum()
)

print("\nCustomer Match Status:")
print(
    chargebacks["customer_match_status"]
    .value_counts(dropna=False)
)

print("\nMerchant Match Status:")
print(
    chargebacks["merchant_match_status"]
    .value_counts(dropna=False)
)

print("\nTransaction Match Status:")
print(
    chargebacks["transaction_match_status"]
    .value_counts(dropna=False)
)

print("\nUser Consistency Status:")
print(
    chargebacks["user_consistency_status"]
    .value_counts(dropna=False)
)

print("\nMerchant Consistency Status:")
print(
    chargebacks["merchant_consistency_status"]
    .value_counts(dropna=False)
)