"""
One customer per user_id for dim_customer.

cleaned_kyc_records can still have the same USR id twice with different
names/cities (messy source, not exact-row dups). We do not drop them in
cleaning. Here we score completeness + Approved KYC and keep the best row
so we don't throw away a usable customer profile.
"""

from pathlib import Path
import pandas as pd


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

kyc = pd.read_csv(
    PROCESSED_DIR / "cleaned_kyc_records.csv"
)

kyc["user_id"] = (
    kyc["user_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s_-]", "", regex=True)
)

kyc["signup_timestamp"] = pd.to_datetime(
    kyc["signup_timestamp"],
    errors="coerce"
)

score_columns = [
    "pan",
    "aadhaar",
    "date_of_birth",
    "monthly_income",
    "occupation",
    "city",
    "state",
    "signup_timestamp",
    "risk_segment"
]

kyc["completeness_score"] = (
    kyc[score_columns].notna().sum(axis=1)
)

kyc["kyc_status_score"] = (
    kyc["kyc_status"]
    .eq("Approved")
    .astype(int) * 2
)

kyc["total_score"] = (
    kyc["completeness_score"] +
    kyc["kyc_status_score"]
)

kyc = kyc.sort_values(
    ["user_id", "total_score", "signup_timestamp"],
    ascending=[True, False, False]
)

dim_customer = (
    kyc
    .drop_duplicates("user_id", keep="first")
    .copy()
)

dim_customer = dim_customer.drop(
    columns=[
        "completeness_score",
        "kyc_status_score",
        "total_score"
    ]
)

dim_customer.to_csv(
    PROCESSED_DIR / "dim_customer.csv",
    index=False
)

print("dim_customer created")
print("Total records:", len(dim_customer))
print("Unique user IDs:", dim_customer["user_id"].nunique())