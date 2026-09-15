"""
One merchant per merchant_id for dim_merchant.

Same MCH id can appear with conflicting status/category. We score filled
fields + Active status, keep the best row, and add merchant_key as a
surrogate PK. Facts still join on merchant_id.
"""

from pathlib import Path
import pandas as pd


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

merchants = pd.read_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv"
)

merchants["merchant_id"] = (
    merchants["merchant_id"]
    .astype("string")
    .str.strip()
    .str.upper()
)

score_columns = [
    "merchant_name",
    "mcc",
    "merchant_category",
    "business_type",
    "city",
    "state",
    "onboarding_date",
    "settlement_account",
    "declared_avg_ticket_size"
]

merchants["data_quality_score"] = (
    merchants[score_columns].notna().sum(axis=1)
)

merchants["status_score"] = (
    merchants["merchant_status"]
    .eq("Active")
    .astype(int)
)

merchants["total_score"] = (
    merchants["data_quality_score"] +
    merchants["status_score"]
)

merchants["onboarding_date"] = pd.to_datetime(
    merchants["onboarding_date"],
    errors="coerce"
)

merchants = merchants.sort_values(
    ["merchant_id", "total_score", "onboarding_date"],
    ascending=[True, False, False]
)

unique_merchants = (
    merchants
    .drop_duplicates("merchant_id", keep="first")
    .copy()
)

unique_merchants.insert(
    0,
    "merchant_key",
    range(1, len(unique_merchants) + 1)
)

unique_merchants = unique_merchants.drop(
    columns=["data_quality_score", "status_score", "total_score"]
)

unique_merchants.to_csv(
    PROCESSED_DIR / "dim_merchant.csv",
    index=False
)

print("dim_merchant created")
print("Total records:", len(unique_merchants))
print("Unique merchant IDs:", unique_merchants["merchant_id"].nunique())