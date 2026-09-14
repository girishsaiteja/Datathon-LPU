import pandas as pd
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()

RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

FILE_PATH = PROCESSED_DIR / "cleaned_chargebacks.csv"

chargebacks = pd.read_csv(FILE_PATH)

print("\n================ CHARGEBACK VALIDATION ================\n")

# ============================================================
# BASIC INFORMATION
# ============================================================

print("--- BASIC INFORMATION ---")
print("Rows:", len(chargebacks))
print("Columns:", len(chargebacks.columns))

print("\nColumns:")
print(chargebacks.columns.tolist())


# ============================================================
# DATA TYPES
# ============================================================

print("\n--- DATA TYPES ---")
print(chargebacks.dtypes)


# ============================================================
# DUPLICATES
# ============================================================

print("\n--- DUPLICATES ---")

print(
    "Exact duplicate rows:",
    chargebacks.duplicated().sum()
)

if "complaint_id" in chargebacks.columns:

    print(
        "Duplicate complaint_id:",
        chargebacks["complaint_id"].duplicated().sum()
    )

    print(
        "Rows with duplicate complaint_id:",
        chargebacks["complaint_id"].duplicated(keep=False).sum()
    )


# ============================================================
# MISSING VALUES
# ============================================================

print("\n--- MISSING VALUES ---")

print(
    chargebacks.isna().sum().to_string()
)


# ============================================================
# COMPLAINT ID
# ============================================================

print("\n--- COMPLAINT_ID ---")

complaint_id = (
    chargebacks["complaint_id"]
    .astype("string")
    .str.strip()
)

print("Missing:", complaint_id.isna().sum())

print(
    "Invalid:",
    (
        complaint_id.notna()
        & ~complaint_id.str.fullmatch(
            r"CBK\d{7}",
            na=False
        )
    ).sum()
)


# ============================================================
# TRANSACTION ID
# ============================================================

print("\n--- TXN_ID ---")

txn_id = (
    chargebacks["txn_id"]
    .astype("string")
    .str.strip()
)

print("Missing:", txn_id.isna().sum())

print(
    "Invalid:",
    (
        txn_id.notna()
        & ~txn_id.str.fullmatch(
            r"TXN\d{8}",
            na=False
        )
    ).sum()
)


# ============================================================
# USER ID
# ============================================================

print("\n--- USER_ID ---")

user_id = (
    chargebacks["user_id"]
    .astype("string")
    .str.strip()
)

print("Missing:", user_id.isna().sum())

print(
    "Invalid:",
    (
        user_id.notna()
        & ~user_id.str.fullmatch(
            r"USR\d{5}",
            na=False
        )
    ).sum()
)


# ============================================================
# MERCHANT ID
# ============================================================

print("\n--- MERCHANT_ID ---")

merchant_id = (
    chargebacks["merchant_id"]
    .astype("string")
    .str.strip()
)

print("Missing:", merchant_id.isna().sum())

print(
    "Invalid:",
    (
        merchant_id.notna()
        & ~merchant_id.str.fullmatch(
            r"MCH\d{4}",
            na=False
        )
    ).sum()
)


# ============================================================
# DISPUTED AMOUNT
# ============================================================

print("\n--- DISPUTED_AMOUNT ---")

amount = pd.to_numeric(
    chargebacks["disputed_amount"],
    errors="coerce"
)

print("Missing:", amount.isna().sum())

print(
    "Invalid numeric:",
    (
        chargebacks["disputed_amount"].notna()
        & amount.isna()
    ).sum()
)

print(
    "Zero:",
    (amount == 0).sum()
)

print(
    "Negative:",
    (amount < 0).sum()
)

print(
    "Minimum:",
    amount.min()
)

print(
    "Maximum:",
    amount.max()
)


# ============================================================
# TIMESTAMPS
# ============================================================

timestamp_columns = [
    "transaction_timestamp",
    "reported_timestamp",
    "bank_response_timestamp"
]

for column in timestamp_columns:

    if column not in chargebacks.columns:
        continue

    print(f"\n--- {column.upper()} ---")

    timestamp = pd.to_datetime(
        chargebacks[column],
        errors="coerce"
    )

    missing = (
        chargebacks[column].isna()
        | chargebacks[column].astype("string").str.strip().eq("")
    )

    invalid = (
        ~missing
        & timestamp.isna()
    )

    print("Missing:", missing.sum())
    print("Invalid:", invalid.sum())

    valid_timestamp = timestamp.dropna()

    if len(valid_timestamp) > 0:
        print("Minimum:", valid_timestamp.min())
        print("Maximum:", valid_timestamp.max())


# ============================================================
# REASON CODE
# ============================================================

print("\n--- REASON_CODE ---")

print(
    "Missing:",
    chargebacks["reason_code"].isna().sum()
)

print(
    "Unique:",
    chargebacks["reason_code"].nunique(dropna=True)
)

print(
    "Values:"
)

print(
    chargebacks["reason_code"]
    .value_counts(dropna=False)
    .to_string()
)


# ============================================================
# RESOLUTION STATUS
# ============================================================

print("\n--- RESOLUTION_STATUS ---")

print(
    "Missing:",
    chargebacks["resolution_status"].isna().sum()
)

print(
    "Unique:",
    chargebacks["resolution_status"].nunique(dropna=True)
)

print(
    "Values:"
)

print(
    chargebacks["resolution_status"]
    .value_counts(dropna=False)
    .to_string()
)


# ============================================================
# SEVERITY
# ============================================================

print("\n--- SEVERITY ---")

print(
    "Missing:",
    chargebacks["severity"].isna().sum()
)

print(
    "Unique:",
    chargebacks["severity"].nunique(dropna=True)
)

print(
    "Values:"
)

print(
    chargebacks["severity"]
    .value_counts(dropna=False)
    .to_string()
)


# ============================================================
# CHANNEL
# ============================================================

print("\n--- CHANNEL ---")

print(
    "Missing:",
    chargebacks["channel"].isna().sum()
)

print(
    "Unique:",
    chargebacks["channel"].nunique(dropna=True)
)

print(
    "Values:"
)

print(
    chargebacks["channel"]
    .value_counts(dropna=False)
    .to_string()
)


# ============================================================
# COMPLAINT TEXT
# ============================================================

print("\n--- COMPLAINT_TEXT ---")

print(
    "Missing:",
    chargebacks["complaint_text"].isna().sum()
)

print(
    "Empty:",
    (
        chargebacks["complaint_text"]
        .astype("string")
        .str.strip()
        .eq("")
    ).sum()
)


# ============================================================
# FOREIGN KEY FORMAT CHECK
# ============================================================

print("\n--- FOREIGN KEY FORMAT CHECK ---")

print(
    "Invalid txn_id:",
    (
        ~chargebacks["txn_id"]
        .astype("string")
        .str.fullmatch(
            r"TXN\d{8}",
            na=False
        )
    ).sum()
)

print(
    "Invalid user_id:",
    (
        ~chargebacks["user_id"]
        .astype("string")
        .str.fullmatch(
            r"USR\d{5}",
            na=False
        )
    ).sum()
)

print(
    "Invalid merchant_id:",
    (
        ~chargebacks["merchant_id"]
        .astype("string")
        .str.fullmatch(
            r"MCH\d{4}",
            na=False
        )
    ).sum()
)


# ============================================================
# SAMPLE DATA
# ============================================================

print("\n--- SAMPLE RECORDS ---")

print(
    chargebacks.head(10).to_string(index=False)
)


print("\n================ VALIDATION COMPLETE ================\n")



print("\n--- SEVERITY + CHANNEL CONSISTENCY ---")

valid_severity = [
    "Low",
    "Medium",
    "High",
    "Critical"
]

valid_channel = [
    "IVR",
    "Chatbot",
    "Email",
    "Branch",
    "App",
    "Call Center"
]

bad_severity = ~chargebacks["severity"].isin(valid_severity)
bad_channel = ~chargebacks["channel"].isin(valid_channel)

print("Invalid severity:", bad_severity.sum())
print("Invalid channel:", bad_channel.sum())

print("\nSuspicious severity values:")
print(
    chargebacks.loc[
        bad_severity,
        "severity"
    ].value_counts().to_string()
)

print("\nSuspicious channel values:")
print(
    chargebacks.loc[
        bad_channel,
        "channel"
    ].value_counts().to_string()
)