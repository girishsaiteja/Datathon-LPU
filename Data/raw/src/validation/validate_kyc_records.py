import pandas as pd
from pathlib import Path


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

kyc = pd.read_csv(
    PROCESSED_DIR / "cleaned_kyc_records.csv"
)


print("\n================ KYC VALIDATION ================\n")


# 1. Duplicates
print("--- DUPLICATES ---")

exact_duplicates = kyc.duplicated().sum()
duplicate_user_ids = kyc["user_id"].duplicated().sum()

print("Exact duplicate rows:", exact_duplicates)
print("Duplicate user_id:", duplicate_user_ids)


# 2. Missing values
print("\n--- MISSING VALUES ---")

missing = kyc.isna().sum()

for column, count in missing.items():
    if count > 0:
        print(f"{column}: {count}")


# 3. user_id
print("\n--- USER_ID ---")

invalid_user_id = kyc[
    kyc["user_id"].notna() &
    ~kyc["user_id"].astype("string").str.match(
        r"^USR\d{5}$",
        na=False
    )
]

print("Missing:", kyc["user_id"].isna().sum())
print("Invalid format:", len(invalid_user_id))


# 4. full_name
print("\n--- FULL_NAME ---")

print("Missing:", kyc["full_name"].isna().sum())

print(
    "Empty:",
    kyc["full_name"]
    .astype("string")
    .str.strip()
    .eq("")
    .sum()
)


# 5. PAN
print("\n--- PAN ---")

print("Missing:", kyc["pan"].isna().sum())

invalid_pan = kyc[
    kyc["pan"].notna() &
    ~kyc["pan"].astype("string").str.match(
        r"^[A-Z]{5}[0-9]{4}[A-Z]$",
        na=False
    )
]

print("Invalid format:", len(invalid_pan))


# 6. Aadhaar
print("\n--- AADHAAR ---")

print("Missing:", kyc["aadhaar"].isna().sum())

aadhaar_clean = (
    kyc["aadhaar"]
    .astype("string")
    .str.replace(r"[\s-]", "", regex=True)
)

invalid_aadhaar = kyc[
    kyc["aadhaar"].notna() &
    ~aadhaar_clean.str.match(
        r"^\d{12}$",
        na=False
    )
]

print("Invalid format:", len(invalid_aadhaar))


# 7. Date of birth
print("\n--- DATE_OF_BIRTH ---")

dob = pd.to_datetime(
    kyc["date_of_birth"],
    errors="coerce"
)

print("Missing:", dob.isna().sum())

if dob.notna().any():
    print("Minimum DOB:", dob.min())
    print("Maximum DOB:", dob.max())

# --- DATE_OF_BIRTH ---

print("\n--- DATE_OF_BIRTH ---")

raw_dob = kyc["date_of_birth"].astype("string").str.strip()

print("\nNegative DOB values:")
negative_dob = raw_dob[
    raw_dob.str.fullmatch(r"-\d+", na=False)
]

if len(negative_dob) > 0:
    print(negative_dob.value_counts().to_string())
else:
    print("No negative DOB values found.")

print("\nNumeric DOB values that are not standard dates:")
numeric_dob = raw_dob[
    raw_dob.str.fullmatch(r"\d+", na=False)
]

print(numeric_dob.value_counts().to_string())

print("\nNon-standard / suspicious DOB values:")

parsed_dob = pd.to_datetime(
    raw_dob,
    format="mixed",
    dayfirst=True,
    errors="coerce"
)

invalid_dob = raw_dob[
    raw_dob.notna()
    & raw_dob.ne("")
    & parsed_dob.isna()
]

if len(invalid_dob) > 0:
    print(invalid_dob.value_counts().to_string())
else:
    print("No invalid DOB values found.")
# 8. City
print("\n--- CITY ---")

print("Missing:", kyc["city"].isna().sum())
print("Unique cities:", kyc["city"].nunique())


# 9. State
print("\n--- STATE ---")

print("Missing:", kyc["state"].isna().sum())
print("Unique states:", kyc["state"].nunique())


# 10. Monthly income
print("\n--- MONTHLY_INCOME ---")

income = pd.to_numeric(
    kyc["monthly_income"],
    errors="coerce"
)

print("Missing:", income.isna().sum())
print("Zero:", (income == 0).sum())
print("Negative:", (income < 0).sum())
print("Invalid numeric:", income.isna().sum() - kyc["monthly_income"].isna().sum())


# 11. Occupation
print("\n--- OCCUPATION ---")

print("Missing:", kyc["occupation"].isna().sum())
print("Unique occupations:", kyc["occupation"].nunique())

print(
    "Values:",
    sorted(
        kyc["occupation"]
        .dropna()
        .unique()
        .tolist()
    )
)


# 12. Signup timestamp
print("\n--- SIGNUP_TIMESTAMP ---")

signup = pd.to_datetime(
    kyc["signup_timestamp"],
    errors="coerce"
)

print("Missing", signup.isna().sum())


# 13. KYC status
print("\n--- KYC_STATUS ---")

valid_kyc_status = {
    "Approved",
    "Rejected",
    "Pending",
    "In Progress"
}

invalid_kyc_status = kyc[
    kyc["kyc_status"].notna() &
    ~kyc["kyc_status"].isin(valid_kyc_status)
]

print("Missing:", kyc["kyc_status"].isna().sum())
print("Invalid:", len(invalid_kyc_status))

print(
    "Values:",
    sorted(
        kyc["kyc_status"]
        .dropna()
        .unique()
        .tolist()
    )
)


# 14. Risk segment
print("\n--- RISK_SEGMENT ---")

valid_risk_segments = {
    "low",
    "medium",
    "high"
}

risk_values = (
    kyc["risk_segment"]
    .dropna()
    .astype("string")
    .str.lower()
)

invalid_risk = kyc[
    kyc["risk_segment"].notna() &
    ~risk_values.isin(valid_risk_segments)
]

print("Missing:", kyc["risk_segment"].isna().sum())
print("Invalid:", len(invalid_risk))

print(
    "Values:",
    sorted(
        kyc["risk_segment"]
        .dropna()
        .unique()
        .tolist()
    )
)


# 15. Data types
print("\n--- DATA TYPES ---")

print(kyc.dtypes)


print("\n================ VALIDATION COMPLETE ================\n")


print("\n--- SAMPLE INVALID DOB ---")
invalid_dob = kyc[
    kyc["date_of_birth"].notna() &
    pd.to_datetime(
        kyc["date_of_birth"],
        errors="coerce"
    ).isna()
]

print(
    invalid_dob["date_of_birth"]
    .drop_duplicates()
    .head(20)
    .to_string(index=False)
)


