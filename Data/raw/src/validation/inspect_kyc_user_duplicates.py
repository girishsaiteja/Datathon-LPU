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

duplicate_ids = (
    kyc["user_id"]
    .value_counts()
)

duplicate_ids = duplicate_ids[
    duplicate_ids > 1
].index

duplicates = kyc[
    kyc["user_id"].isin(duplicate_ids)
].copy()

print("Duplicate KYC rows:", len(duplicates))
print("Duplicate user IDs:", duplicates["user_id"].nunique())

print("\nSample duplicate user records:")
print(
    duplicates[
        [
            "user_id",
            "full_name",
            "pan",
            "aadhaar",
            "date_of_birth",
            "monthly_income",
            "occupation",
            "kyc_status",
            "risk_segment",
            "signup_timestamp"
        ]
    ]
    .head(30)
    .to_string(index=False)
)