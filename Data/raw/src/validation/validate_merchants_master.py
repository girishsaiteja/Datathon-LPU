import pandas as pd
from pathlib import Path


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

merchants = pd.read_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv"
)


print("\n================ MERCHANT MASTER VALIDATION ================\n")


# 1. Duplicates
print("--- DUPLICATES ---")

exact_duplicates = merchants.duplicated().sum()
duplicate_merchant_ids = merchants["merchant_id"].duplicated().sum()

print("Exact duplicate rows:", exact_duplicates)
print("Duplicate merchant_id:", duplicate_merchant_ids)


# 2. Missing values
print("\n--- MISSING VALUES ---")

missing = merchants.isna().sum()

for column, count in missing.items():
    if count > 0:
        print(f"{column}: {count}")


# 3. merchant_id
print("\n--- MERCHANT_ID ---")

invalid_merchant_id = merchants[
    merchants["merchant_id"].notna() &
    ~merchants["merchant_id"].astype("string").str.match(
        r"^MCH\d{4}$", na=False
    )
]

print("Missing:", merchants["merchant_id"].isna().sum())
print("Invalid format:", len(invalid_merchant_id))


# 4. merchant_name
print("\n--- MERCHANT_NAME ---")

print("Missing:", merchants["merchant_name"].isna().sum())
print(
    "Empty:",
    (
        merchants["merchant_name"]
        .astype("string")
        .str.strip()
        .eq("")
    ).sum()
)


# 5. MCC
print("\n--- MCC ---")

mcc_numeric = pd.to_numeric(
    merchants["mcc"],
    errors="coerce"
)

missing_mcc = merchants["mcc"].isna().sum()

invalid_mcc = merchants[
    merchants["mcc"].notna() &
    mcc_numeric.isna()
]

print("Missing:", missing_mcc)
print("Invalid format:", len(invalid_mcc))
# 6. Merchant category
print("\n--- MERCHANT_CATEGORY ---")

print("Missing:", merchants["merchant_category"].isna().sum())

print(
    "Unique categories:",
    merchants["merchant_category"].nunique()
)


# 7. Business type
print("\n--- BUSINESS_TYPE ---")

print("Missing:", merchants["business_type"].isna().sum())

print(
    "Unique business types:",
    merchants["business_type"].nunique()
)

print(
    "Values:",
    sorted(
        merchants["business_type"]
        .dropna()
        .unique()
        .tolist()
    )
)


# 8. City
print("\n--- CITY ---")

print("Missing:", merchants["city"].isna().sum())

print(
    "Unique cities:",
    merchants["city"].nunique()
)


# 9. State
print("\n--- STATE ---")

print("Missing:", merchants["state"].isna().sum())

print(
    "Unique states:",
    merchants["state"].nunique()
)


# 10. Onboarding date
print("\n--- ONBOARDING_DATE ---")

onboarding_date = pd.to_datetime(
    merchants["onboarding_date"],
    errors="coerce"
)

print("Missing/invalid:", onboarding_date.isna().sum())


# 11. Settlement account
print("\n--- SETTLEMENT_ACCOUNT ---")

print(
    "Missing:",
    merchants["settlement_account"].isna().sum()
)


# 12. Merchant status
print("\n--- MERCHANT_STATUS ---")

valid_statuses = {
    "Active",
    "Inactive",
    "Suspended",
    "On Hold"
}

invalid_status = merchants[
    merchants["merchant_status"].notna() &
    ~merchants["merchant_status"].isin(valid_statuses)
]

print("Missing:", merchants["merchant_status"].isna().sum())
print("Invalid:", len(invalid_status))


# 13. Declared average ticket size
print("\n--- DECLARED_AVG_TICKET_SIZE ---")

print(
    "Missing:",
    merchants["declared_avg_ticket_size"].isna().sum()
)

print(
    "Zero:",
    (merchants["declared_avg_ticket_size"] == 0).sum()
)

print(
    "Negative:",
    (merchants["declared_avg_ticket_size"] < 0).sum()
)


# 14. Data types
print("\n--- DATA TYPES ---")

print(merchants.dtypes)


print("\n================ VALIDATION COMPLETE ================\n")


print("\n--- DUPLICATE MERCHANT_ID ANALYSIS ---")

duplicate_merchants = merchants[
    merchants["merchant_id"].duplicated(keep=False)
].sort_values("merchant_id")

print("Rows involved:", len(duplicate_merchants))
print("Unique duplicate merchant_ids:",
      duplicate_merchants["merchant_id"].nunique())


# Check whether duplicate merchant IDs have conflicting values
columns_to_compare = [
    "merchant_name",
    "mcc",
    "merchant_category",
    "business_type",
    "city",
    "state",
    "onboarding_date",
    "settlement_account",
    "merchant_status",
    "declared_avg_ticket_size"
]

conflicting_merchants = (
    duplicate_merchants
    .groupby("merchant_id")[columns_to_compare]
    .nunique(dropna=False)
)

conflicting_merchants["conflicting_columns"] = (
    conflicting_merchants > 1
).sum(axis=1)

conflicting = conflicting_merchants[
    conflicting_merchants["conflicting_columns"] > 0
]

identical = conflicting_merchants[
    conflicting_merchants["conflicting_columns"] == 0
]

print("\nDuplicate merchant_ids with identical records:",
      len(identical))

print("Duplicate merchant_ids with conflicting records:",
      len(conflicting))

print("\nTotal duplicate rows:",
      len(duplicate_merchants))

print("\nDuplicate rows that are completely identical:")
print(
    duplicate_merchants[
        duplicate_merchants.duplicated(keep=False)
    ].shape[0]
)

