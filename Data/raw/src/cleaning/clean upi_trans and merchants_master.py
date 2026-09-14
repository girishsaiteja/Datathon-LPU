#upi transactions

import pandas as pd
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parents[2]

transactions = pd.read_csv(
    RAW_DIR / "track1_upi_transactions.csv"
)


#tnx_id
# all correct



#timestamp
timestamp = transactions["timestamp"].astype(str).str.strip()

numeric_timestamp = pd.to_numeric(timestamp, errors="coerce")

transactions["timestamp"] = pd.NaT

unix_mask = numeric_timestamp.notna()

transactions.loc[unix_mask, "timestamp"] = pd.to_datetime(
    numeric_timestamp[unix_mask],
    unit="s",
    errors="coerce"
)

date_mask = ~unix_mask

transactions.loc[date_mask, "timestamp"] = pd.to_datetime(
    timestamp[date_mask],
    format="mixed",
    dayfirst=True,
    errors="coerce"
)

#user_id
transactions["user_id"] = transactions["user_id"].astype(str).str.upper()


#merchant_id
# print("\nMerchant ID length distribution:")
# print(
#     transactions["merchant_id"]
#     .astype(str)
#     .str.len()
#     .value_counts()
#     .sort_index()
# )




# #amount
transactions["amount"] = pd.to_numeric(
    transactions["amount"]
    .astype(str)
    .str.replace(r"[₹,]", "", regex=True)
    .str.replace(r"Rs\.?", "", regex=True)
    .str.replace(r"INR", "", regex=True)
    .str.strip(),
    errors="coerce"
).abs().round(2)



#utr
transactions["utr"] = (
    transactions["utr"]
    .astype("string")
    .str.replace(r"\s+", "", regex=True)
    .str.upper()
)

# print("\nUTR length distribution:")
# print(
#     transactions["utr"]
#     .dropna()
#     .str.len()
#     .value_counts()
#     .sort_index()
# )

# invalid_utr = transactions[
#     transactions["utr"].notna() &
#     ~transactions["utr"].str.match(r"^UTR\d{10}$", na=False)
# ]

# print("\nNumber of invalid UTRs:")
# print(len(invalid_utr))


#mcc
transactions["mcc"] = (
    transactions["mcc"]
    .astype("string")
    .str.strip()
)


#status
transactions["status"] = (
    transactions["status"]
    .astype("string")
    .str.strip()
    .str.lower()
)

status_map = {
    "completed": "Success",
    "txn_success": "Success",
    "success": "Success",
    "s": "Success",

    "txn_failed": "Failed",
    "failed": "Failed",
    "fail": "Failed",
    "declined": "Failed",
    "f": "Failed",

    "pending": "Pending",

    "initiated": "Processing",
    "processing": "Processing"
}

transactions["status"] = transactions["status"].map(status_map)



#remove duplicates
transactions = transactions.drop_duplicates().reset_index(drop=True)

# Set final data types for upi trans

transactions["txn_id"] = transactions["txn_id"].astype("string")
transactions["user_id"] = transactions["user_id"].astype("string")
transactions["merchant_id"] = transactions["merchant_id"].astype("string")
transactions["utr"] = transactions["utr"].astype("string")

transactions["timestamp"] = pd.to_datetime(
    transactions["timestamp"],
    errors="coerce"
)

transactions["amount"] = pd.to_numeric(
    transactions["amount"],
    errors="coerce"
).astype("float64")

transactions["mcc"] = pd.to_numeric(
    transactions["mcc"],
    errors="coerce"
).astype("Int64")

transactions["status"] = transactions["status"].astype("string")




#merchants_master


merchants = pd.read_csv(
    RAW_DIR / "track1_merchants_master.csv"
)

#merchant_id
merchants["merchant_id"] = (
    merchants["merchant_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s_-]", "", regex=True)
)

merchants["merchant_id"] = merchants["merchant_id"].where(
    merchants["merchant_id"].str.match(r"^MCH\d{4}$", na=False),
    merchants["merchant_id"].where(
        merchants["merchant_id"].str.match(r"^\d{4}$", na=False),
        pd.NA
    )
)

merchants["merchant_id"] = merchants["merchant_id"].mask(
    merchants["merchant_id"].str.match(r"^\d{4}$", na=False),
    "MCH" + merchants["merchant_id"]
)


#merchant_name
merchants["merchant_name"] = (
    merchants["merchant_name"]
    .astype("string")
    .str.strip()
    .str.replace(r"\s+", " ", regex=True)
    .str.title()
)

# #mcc
merchants["mcc"] = (
    merchants["mcc"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"^MCC-", "", regex=True)
)

merchants["mcc"] = pd.to_numeric(
    merchants["mcc"],
    errors="coerce"
).astype("Int64")


# merchant_category

merchants["merchant_category"] = (
    merchants["merchant_category"]
    .astype("string")
    .str.strip()
    .str.lower()
)

category_map = {
    "hotel_lodging": "Hotel & Lodging",
    "hotels": "Hotel & Lodging",
    "hotel": "Hotel & Lodging",
    "hospitality": "Hotel & Lodging",

    "apparel": "Apparel & Fashion",
    "garments": "Apparel & Fashion",
    "clothing": "Apparel & Fashion",
    "cloths": "Apparel & Fashion",
    "fashion": "Apparel & Fashion",

    "retail": "Retail",

    "transportation": "Transportation",
    "transport": "Transportation",
    "transprt": "Transportation",
    "bus/taxi": "Transportation",

    "restaurant": "Restaurants & Food",
    "restaurants": "Restaurants & Food",
    "eating place": "Restaurants & Food",
    "food": "Restaurants & Food",
    "food_services": "Restaurants & Food",

    "department store": "Department Store",
    "department stores": "Department Store",
    "dept_store": "Department Store",

    "grocery": "Grocery",
    "groceries": "Grocery",
    "grocery stores": "Grocery",
    "grocery_store": "Grocery",
    "kirana": "Grocery",

    "misc retail": "Miscellaneous",
    "retail other": "Miscellaneous",
    "other": "Miscellaneous",
    "miscellaneous": "Miscellaneous",

    "telecom": "Telecom",
    "mobile recharge": "Telecom",
    "phone service": "Telecom",

    "book store": "Books & Stationery",
    "books": "Books & Stationery",
    "books_stationery": "Books & Stationery",
    "stationery": "Books & Stationery",

    "medical_store": "Medical",
    "medical": "Medical",

    "pharmacies": "Pharmacy",
    "pharmacy": "Pharmacy",
    "chemist": "Pharmacy",

    "travel": "Travel"
}

merchants["merchant_category"] = merchants["merchant_category"].map(category_map)



#business type

merchants["business_type"] = (
    merchants["business_type"]
    .astype("string")
    .str.strip()
    .str.lower()
    .str.replace("_", " ", regex=False)
    .str.replace("-", " ", regex=False)
)

business_type_map = {
    "private limited": "Private Limited",
    "individual": "Individual",
    "sole proprietor": "Sole Proprietor",
    "partnership": "Partnership"
}

merchants["business_type"] = merchants["business_type"].map(business_type_map)


#city


merchants["city"] = (
    merchants["city"]
    .astype("string")
    .str.strip()
    .str.lower()
)

city_map = {
    "ludhiana": "Ludhiana",
    "ldh": "Ludhiana",

    "jalandhar": "Jalandhar",
    "jalandar": "Jalandhar",

    "hyderabad": "Hyderabad",
    "hyd": "Hyderabad",

    "chennai": "Chennai",
    "madras": "Chennai",

    "jaipur": "Jaipur",
    "jpr": "Jaipur",

    "amritsar": "Amritsar",
    "asr": "Amritsar",

    "lucknow": "Lucknow",
    "lko": "Lucknow",

    "delhi": "Delhi",
    "dilli": "Delhi",
    "new delhi": "Delhi",

    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "mumbay": "Mumbai",

    "kolkata": "Kolkata",
    "calcutta": "Kolkata",

    "pune": "Pune",
    "poona": "Pune",

    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "blr": "Bengaluru"
}

merchants["city"] = merchants["city"].map(city_map)



#on boarding date
import pandas as pd
import re

def clean_onboarding_date(value):

    if pd.isna(value):
        return pd.NaT

    value = str(value).strip()

    if value == "":
        return pd.NaT

    # Unix timestamp
    if re.fullmatch(r"\d{10}", value):
        return pd.to_datetime(
            int(value),
            unit="s",
            errors="coerce"
        ).normalize()

    # DD-MMM-YY / DD-MMM-YYYY with optional time
    if re.fullmatch(
        r"\d{1,2}-[A-Za-z]{3}-\d{2,4}(?:\s+\d{1,2}:\d{2})?",
        value
    ):
        return pd.to_datetime(
            value,
            dayfirst=True,
            errors="coerce"
        ).normalize()

    # Numeric date with optional time
    match = re.fullmatch(
        r"(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+\d{1,2}:\d{2})?",
        value
    )

    if match:

        first = int(match.group(1))
        second = int(match.group(2))

        # First number > 12 → DD-MM-YY
        if first > 12:
            return pd.to_datetime(
                value,
                dayfirst=True,
                errors="coerce"
            ).normalize()

        # Second number > 12 → MM-DD-YY
        if second > 12:
            return pd.to_datetime(
                value,
                dayfirst=False,
                errors="coerce"
            ).normalize()

        # Ambiguous → DD-MM-YY
        return pd.to_datetime(
            value,
            dayfirst=True,
            errors="coerce"
        ).normalize()

    # Invalid values
    return pd.NaT


merchants["onboarding_date"] = merchants["onboarding_date"].apply(
    clean_onboarding_date
)

# Remove time
merchants["onboarding_date"] = merchants["onboarding_date"].dt.date




#settlement_account

merchants["settlement_account"] = (
    merchants["settlement_account"]
    .astype("string")
    .str.strip()
    .str.upper()
)


#merchant analysis
merchants["merchant_status"] = (
    merchants["merchant_status"]
    .astype("string")
    .str.strip()
    .str.lower()
)

status_map = {
    "a": "active",
    "active": "active",
    "live": "active",
    "enabled": "active",

    "i": "inactive",
    "inactive": "inactive",
    "disabled": "inactive",
    "closed": "inactive",

    "s": "suspended",
    "suspended": "suspended",
    "blocked": "suspended",

    "hold": "on hold"
}

merchants["merchant_status"] = merchants["merchant_status"].map(status_map)

merchants["merchant_status"] = merchants["merchant_status"].str.title()


#declared_avg_ticket_size
merchants["declared_avg_ticket_size"] = pd.to_numeric(
    merchants["declared_avg_ticket_size"]
    .astype("string")
    .str.strip()
    .str.replace(r"INR", "", regex=True, case=False)
    .str.replace(r"Rs\.?", "", regex=True, case=False)
    .str.replace("₹", "", regex=False)
    .str.replace(",", "", regex=False)
    .str.strip(),
    errors="coerce"
)


#we are checking the negatives medium to medium of transactions amount if there are close the negatives can be positive if not they are invalid and can be null
merchant_txn_avg = (
    transactions
    .groupby("merchant_id")["amount"]
    .mean()
    .reset_index()
    .rename(columns={"amount": "actual_avg_transaction"})
)

merchant_comparison = merchants.merge(
    merchant_txn_avg,
    on="merchant_id",
    how="left"
)

negative_check = merchant_comparison[
    merchant_comparison["declared_avg_ticket_size"] < 0
][
    [
        "merchant_id",
        "declared_avg_ticket_size",
        "actual_avg_transaction"
    ]
]

# print(negative_check.head(50).to_string(index=False))


negative_count = (merchants["declared_avg_ticket_size"] < 0).sum()

merchants.loc[
    merchants["declared_avg_ticket_size"] < 0,
    "declared_avg_ticket_size"
] = pd.NA


# Convert MCC to nullable integer
transactions["mcc"] = pd.to_numeric(
    transactions["mcc"],
    errors="coerce"
).astype("Int64")

merchants["mcc"] = pd.to_numeric(
    merchants["mcc"],
    errors="coerce"
).astype("Int64")


# Fill missing transaction MCC from merchant master
# only when one unique MCC exists for the merchant

merchant_mcc_unique = (
    merchants[merchants["mcc"].notna()]
    .groupby("merchant_id")["mcc"]
    .agg(["nunique", "first"])
    .reset_index()
)

unique_merchant_mcc = merchant_mcc_unique[
    merchant_mcc_unique["nunique"] == 1
]

merchant_mcc_lookup = (
    unique_merchant_mcc
    .set_index("merchant_id")["first"]
)

transaction_fill_mask = (
    transactions["mcc"].isna()
    & transactions["merchant_id"].isin(merchant_mcc_lookup.index)
)

transactions.loc[transaction_fill_mask, "mcc"] = (
    transactions.loc[
        transaction_fill_mask,
        "merchant_id"
    ].map(merchant_mcc_lookup)
)


# Fill missing merchant MCC from transactions
# only when one unique MCC exists for the merchant

txn_mcc_unique = (
    transactions[transactions["mcc"].notna()]
    .groupby("merchant_id")["mcc"]
    .agg(["nunique", "first"])
    .reset_index()
)

unique_txn_mcc = txn_mcc_unique[
    txn_mcc_unique["nunique"] == 1
]

txn_mcc_lookup = (
    unique_txn_mcc
    .set_index("merchant_id")["first"]
)

merchant_fill_mask = (
    merchants["mcc"].isna()
    & merchants["merchant_id"].isin(txn_mcc_lookup.index)
)

merchants.loc[merchant_fill_mask, "mcc"] = (
    merchants.loc[
        merchant_fill_mask,
        "merchant_id"
    ].map(txn_mcc_lookup)
)


# Ensure final MCC datatype remains nullable integer

transactions["mcc"] = transactions["mcc"].astype("Int64")
merchants["mcc"] = merchants["mcc"].astype("Int64")
#remove duplicates
merchants = merchants.drop_duplicates().reset_index(drop=True)

merchants["merchant_id"] = merchants["merchant_id"].astype("string")

merchants["merchant_name"] = merchants["merchant_name"].astype("string")

merchants["mcc"] = pd.to_numeric(
    merchants["mcc"],
    errors="coerce"
).astype("Int64")

merchants["merchant_category"] = (
    merchants["merchant_category"].astype("string")
)

merchants["business_type"] = (
    merchants["business_type"].astype("string")
)

merchants["city"] = merchants["city"].astype("string")

merchants["state"] = merchants["state"].astype("string")

merchants["onboarding_date"] = pd.to_datetime(
    merchants["onboarding_date"],
    errors="coerce"
)

merchants["settlement_account"] = (
    merchants["settlement_account"].astype("string")
)

merchants["merchant_status"] = (
    merchants["merchant_status"].astype("string")
)

merchants["declared_avg_ticket_size"] = pd.to_numeric(
    merchants["declared_avg_ticket_size"],
    errors="coerce"
).astype("float64")


print("\n--- FINAL MERCHANT DATA TYPES ---")
print(merchants.dtypes)



# Create processed directory
PROCESSED_DIR = RAW_DIR.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# Save / overwrite cleaned files
transactions.to_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv",
    index=False
)

merchants.to_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv",
    index=False
)


print("\nCleaned UPI transactions saved to:")
print(PROCESSED_DIR / "cleaned_upi_transactions.csv")

print("\nCleaned merchants saved to:")
print(PROCESSED_DIR / "cleaned_merchants_master.csv")