"""
Clean track1 chargebacks (JSON).

Ids are padded (3835 → MCH3835, TXN12345 → TXN00012345). Amounts lose ₹/Rs.
Reason / severity slang (ato, P1–P4, H/L) is mapped to one vocabulary.
Exact duplicate complaints are dropped. Missing txn_id stays NA so we can
still flag unmatched disputes in fact_chargebacks.
"""

from pathlib import Path
import json
import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]

with open(
    RAW_DIR / "track1_chargebacks.json",
    "r",
    encoding="utf-8"
) as file:
    data = json.load(file)

chargebacks = pd.json_normalize(data)
N_CB_RAW = len(chargebacks)
print(f"[CHARGEBACKS] raw rows: {N_CB_RAW}")


#complaint_id
chargebacks["complaint_id"] = (
    chargebacks["complaint_id"]
    .astype("string")
    .str.strip()
    .str.upper()
)


chargebacks = chargebacks.drop_duplicates().reset_index(drop=True)
print(
    f"[CHARGEBACKS] after exact-dup drop: {len(chargebacks)}  "
    f"(from {N_CB_RAW})"
)




#tnx_id
chargebacks["txn_id"] = (
    chargebacks["txn_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .replace("", pd.NA)
)

chargebacks["txn_id"] = chargebacks["txn_id"].str.replace(
    r"^TXN(\d{5})$",
    r"TXN000\1",
    regex=True
)


chargebacks["txn_id"] = chargebacks["txn_id"].str.replace(
    "-",
    "",
    regex=False
)
import re
import pandas as pd

# user_id
chargebacks["user_id"] = (
    chargebacks["user_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s_-]", "", regex=True)
)

chargebacks["user_id"] = chargebacks["user_id"].str.replace(
    r"^(\d{5})$",
    r"USR\1",
    regex=True
)

# merchant_id
chargebacks["merchant_id"] = (
    chargebacks["merchant_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s_-]", "", regex=True)
)

chargebacks["merchant_id"] = chargebacks["merchant_id"].str.replace(
    r"^(\d{4})$",
    r"MCH\1",
    regex=True
)

# timestamp function
def clean_timestamp(value):
    if pd.isna(value):
        return pd.NaT

    value = str(value).strip()

    if value == "":
        return pd.NaT

    if value.isdigit() and len(value) == 10:
        dt = pd.to_datetime(
            int(value),
            unit="s",
            errors="coerce"
        )

        if pd.notna(dt) and 1940 <= dt.year <= 2030:
            return dt

        return value

    return pd.to_datetime(
        value,
        format="mixed",
        dayfirst=True,
        errors="coerce"
    )

# transaction_timestamp
chargebacks["transaction_timestamp"] = (
    chargebacks["transaction_timestamp"]
    .apply(clean_timestamp)
)

# reported_timestamp
chargebacks["reported_timestamp"] = (
    chargebacks["reported_timestamp"]
    .apply(clean_timestamp)
)

# bank_response_timestamp
chargebacks["bank_response_timestamp"] = (
    chargebacks["bank_response_timestamp"]
    .apply(clean_timestamp)
)

# disputed_amount
chargebacks["disputed_amount"] = pd.to_numeric(
    chargebacks["disputed_amount"]
    .astype("string")
    .str.strip()
    .str.replace(r"₹|INR|Rs\.?", "", regex=True, case=False)
    .str.replace(",", "", regex=False)
    .str.strip(),
    errors="coerce"
)

chargebacks["disputed_amount"] = (
    chargebacks["disputed_amount"]
    .abs()
    .round(2)
)

# reason_code
chargebacks["reason_code"] = (
    chargebacks["reason_code"]
    .astype("string")
    .str.strip()
    .str.lower()
)

reason_map = {
    "merchant not delivered": "Merchant Not Delivered",
    "no service": "Merchant Not Delivered",
    "merchant service issue": "Merchant Not Delivered",
    "service not provided": "Merchant Not Delivered",
    "not delivered": "Merchant Not Delivered",
    "item not received": "Merchant Not Delivered",
    "delivery issue": "Merchant Not Delivered",

    "service failed": "Service Failed",

    "login compromised": "Account Compromised",
    "account takeover": "Account Compromised",
    "account hacked": "Account Compromised",
    "ato": "Account Compromised",

    "unauthorised": "Unauthorized Transaction",
    "unauthorized transaction": "Unauthorized Transaction",
    "unauthorized_transaction": "Unauthorized Transaction",
    "unauth txn": "Unauthorized Transaction",
    "not done by me": "Unauthorized Transaction",

    "double debit": "Duplicate Debit",
    "charged twice": "Duplicate Debit",
    "dup_debit": "Duplicate Debit",
    "duplicate debit": "Duplicate Debit",

    "extra amount deducted": "Incorrect Amount",
    "wrong amount": "Incorrect Amount",
    "incorrect amount": "Incorrect Amount",
    "amount mismatch": "Incorrect Amount",

    "customer issue": "Customer Dispute",
    "dispute raised": "Customer Dispute",
    "customer dispute": "Customer Dispute",
    "complaint": "Customer Dispute",

    "fraud suspected": "Fraud",
    "fraud": "Fraud",
    "scam": "Fraud",
    "suspicious transaction": "Fraud"
}

chargebacks["reason_code"] = (
    chargebacks["reason_code"].map(reason_map)
)

# complaint_text
chargebacks["complaint_text"] = (
    chargebacks["complaint_text"]
    .astype("string")
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
    .str.lower()
)

# resolution_status
chargebacks["resolution_status"] = (
    chargebacks["resolution_status"]
    .astype("string")
    .str.strip()
    .str.lower()
)

resolution_map = {
    "closed": "Closed",
    "resolved": "Resolved",
    "rejected": "Rejected",
    "open": "Open",
    "in progress": "In Progress",
    "in_progress": "In Progress",
    "wip": "In Progress",
    "pending bank": "Pending Bank",
    "pending_bank": "Pending Bank"
}

chargebacks["resolution_status"] = (
    chargebacks["resolution_status"].map(resolution_map)
)

# severity
chargebacks["severity"] = (
    chargebacks["severity"]
    .astype("string")
    .str.strip()
    .str.upper()
)

severity_map = {
    "LOW": "Low",
    "L": "Low",
    "P4": "Low",

    "MEDIUM": "Medium",
    "M": "Medium",
    "P3": "Medium",

    "HIGH": "High",
    "H": "High",
    "P2": "High",

    "CRITICAL": "Critical",
    "CRIT": "Critical",
    "P1": "Critical"
}

chargebacks["severity"] = (
    chargebacks["severity"].map(severity_map)
)

# channel
chargebacks["channel"] = (
    chargebacks["channel"]
    .astype("string")
    .str.strip()
    .str.lower()
    .str.title()
)

chargebacks["channel"] = chargebacks["channel"].replace(
    "Ivr",
    "IVR"
)


# data type conversion

chargebacks["complaint_id"] = chargebacks["complaint_id"].astype("string")
chargebacks["txn_id"] = chargebacks["txn_id"].astype("string")
chargebacks["user_id"] = chargebacks["user_id"].astype("string")
chargebacks["merchant_id"] = chargebacks["merchant_id"].astype("string")

chargebacks["transaction_timestamp"] = pd.to_datetime(
    chargebacks["transaction_timestamp"],
    errors="coerce"
)

chargebacks["reported_timestamp"] = pd.to_datetime(
    chargebacks["reported_timestamp"],
    errors="coerce"
)

chargebacks["disputed_amount"] = pd.to_numeric(
    chargebacks["disputed_amount"],
    errors="coerce"
).astype("Float64")

chargebacks["reason_code"] = chargebacks["reason_code"].astype("string")
chargebacks["complaint_text"] = chargebacks["complaint_text"].astype("string")
chargebacks["resolution_status"] = chargebacks["resolution_status"].astype("string")

chargebacks["bank_response_timestamp"] = pd.to_datetime(
    chargebacks["bank_response_timestamp"],
    errors="coerce"
)

chargebacks["severity"] = chargebacks["severity"].astype("string")
chargebacks["channel"] = chargebacks["channel"].astype("string")





#move the data into processed folder
PROCESSED_DIR = RAW_DIR.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

chargebacks.to_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    index=False
)

print("\nCleaned chargebacks saved to:")
print(PROCESSED_DIR / "cleaned_chargebacks.csv")
print(f"[CHARGEBACKS] cleaned rows: {len(chargebacks)}  kept {len(chargebacks) / N_CB_RAW:.1%}")


