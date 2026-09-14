import pandas as pd
from pathlib import Path


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv"
)





# 1. Exact duplicates
print("--- DUPLICATES ---")

exact_duplicates = transactions.duplicated().sum()
duplicate_txn_ids = transactions["txn_id"].duplicated().sum()

print("Exact duplicate rows:", exact_duplicates)
print("Duplicate txn_id:", duplicate_txn_ids)


# 2. Missing values
print("\n--- MISSING VALUES ---")

missing = transactions.isna().sum()

for column, count in missing.items():
    if count > 0:
        print(f"{column}: {count}")


# 3. txn_id
print("\n--- TXN_ID ---")

invalid_txn_id = transactions[
    transactions["txn_id"].notna() &
    ~transactions["txn_id"].astype("string").str.match(
        r"^TXN\d{8}$", na=False
    )
]

print("Missing:", transactions["txn_id"].isna().sum())
print("Invalid format:", len(invalid_txn_id))


# 4. user_id
print("\n--- USER_ID ---")

invalid_user_id = transactions[
    transactions["user_id"].notna() &
    ~transactions["user_id"].astype("string").str.match(
        r"^USR\d{5}$", na=False
    )
]

print("Missing:", transactions["user_id"].isna().sum())
print("Invalid format:", len(invalid_user_id))


# 5. merchant_id
print("\n--- MERCHANT_ID ---")

invalid_merchant_id = transactions[
    transactions["merchant_id"].notna() &
    ~transactions["merchant_id"].astype("string").str.match(
        r"^MCH\d{4}$", na=False
    )
]

print("Missing:", transactions["merchant_id"].isna().sum())
print("Invalid format:", len(invalid_merchant_id))


# 6. Amount
print("\n--- AMOUNT ---")

print("Missing:", transactions["amount"].isna().sum())
print("Zero:", (transactions["amount"] == 0).sum())
print("Negative:", (transactions["amount"] < 0).sum())


# 7. UTR
print("\n--- UTR ---")

invalid_utr = transactions[
    transactions["utr"].notna() &
    ~transactions["utr"].astype("string").str.match(
        r"^UTR\d{10}$", na=False
    )
]

print("Missing:", transactions["utr"].isna().sum())
print("Invalid format:", len(invalid_utr))


# 8. MCC
print("\n--- MCC ---")

print("Missing:", transactions["mcc"].isna().sum())


# 9. Timestamp
print("\n--- TIMESTAMP ---")

timestamp = pd.to_datetime(
    transactions["timestamp"],
    errors="coerce"
)

print("Missing/invalid:", timestamp.isna().sum())


# 10. Status
print("\n--- STATUS ---")

valid_statuses = {
    "Success",
    "Failed",
    "Pending",
    "Processing"
}

invalid_status = transactions[
    transactions["status"].notna() &
    ~transactions["status"].isin(valid_statuses)
]

print("Missing:", transactions["status"].isna().sum())
print("Invalid:", len(invalid_status))





print("\n--- DATA TYPES ---")

print(transactions.dtypes)
