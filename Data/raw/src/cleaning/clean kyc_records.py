"""
Clean track1 KYC / customer records.

We fix ids, OCR-ish names (0→o, 1→l), mixed DOB formats, ₹/k income, city
nicknames and KYC status slang. Exact duplicate rows are removed. Duplicate
user_ids with different details are kept here on purpose — dim_customer later
picks the most complete row instead of deleting customers.
"""

from pathlib import Path
import pandas as pd
import re

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]

kyc = pd.read_csv(
    RAW_DIR / "track1_kyc_records.csv"
)
N_KYC_RAW = len(kyc)
print(f"[KYC] raw rows: {N_KYC_RAW}")


#user_id
kyc["user_id"] = (
    kyc["user_id"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s_-]", "", regex=True)
)

kyc["user_id"] = (
    kyc["user_id"]
    .str.replace(r"^(\d{5})$", r"USR\1", regex=True)
)


# Names: OCR noise in this dump used 0/1 instead of o/l (e.g. G0pal → Gopal).
kyc["full_name"] = (
    kyc["full_name"]
    .str.replace("0", "o", regex=False)
    .str.replace("1", "l", regex=False)
    .str.replace(r"\s+", " ", regex=True)
    .str.strip()
    .str.title()
)


#pan 
kyc["pan"] = (
    kyc["pan"]
    .astype("string")
    .str.strip()
    .str.upper()
    .str.replace(r"[\s-]", "", regex=True)
)


def clean_date_of_birth(value):
    """DOB arrived as unix (sometimes negative), DD-MMM-YY and DD-MM-YYYY.
    Only years 1940–2010 are accepted as a real birth year; anything else
    is left as-is so we don't invent a date.
    """

    if pd.isna(value):
        return pd.NaT

    value = str(value).strip()

    if value == "":
        return value

    # Negative Unix timestamp -> positive Unix timestamp
    if re.fullmatch(r"-\d{7,10}", value):

        value = str(abs(int(value)))

        result = pd.to_datetime(
            int(value),
            unit="s",
            errors="coerce"
        )

        if pd.notna(result) and 1940 <= result.year <= 2010:
            return result.strftime("%Y-%m-%d")

        return value

    # Positive Unix timestamp: 7-10 digit values
    if re.fullmatch(r"\d{7,10}", value):

        result = pd.to_datetime(
            int(value),
            unit="s",
            errors="coerce"
        )

        if pd.notna(result) and 1940 <= result.year <= 2010:
            return result.strftime("%Y-%m-%d")

        return value

    # DD-MMM-YY / DD-MMM-YYYY
    match = re.fullmatch(
        r"(\d{1,2})-([A-Za-z]{3})-(\d{2,4})",
        value
    )

    if match:

        day = int(match.group(1))
        month = match.group(2)
        year = match.group(3)

        if len(year) == 2:
            year = "19" + year if int(year) >= 30 else "20" + year

        result = pd.to_datetime(
            f"{day:02d}-{month}-{year}",
            format="%d-%b-%Y",
            errors="coerce"
        )

        if pd.notna(result) and 1940 <= result.year <= 2010:
            return result.strftime("%Y-%m-%d")

        return value

    # DD-MM-YY / DD-MM-YYYY with optional time
    match = re.fullmatch(
        r"(\d{1,2})-(\d{1,2})-(\d{2,4})(?:\s+\d{1,2}:\d{2})?",
        value
    )

    if match:

        first = int(match.group(1))
        second = int(match.group(2))
        year = match.group(3)

        if len(year) == 2:
            year = "19" + year if int(year) >= 30 else "20" + year

        if first > 12:
            day = first
            month = second

        elif second > 12:
            month = first
            day = second

        else:
            day = first
            month = second

        result = pd.to_datetime(
            f"{day:02d}-{month:02d}-{year}",
            format="%d-%m-%Y",
            errors="coerce"
        )

        if pd.notna(result) and 1940 <= result.year <= 2010:
            return result.strftime("%Y-%m-%d")

        return value

    # Already YYYY-MM-DD
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):

        result = pd.to_datetime(
            value,
            format="%Y-%m-%d",
            errors="coerce"
        )

        if pd.notna(result) and 1940 <= result.year <= 2010:
            return value

        return value

    # Keep unrecognized non-null values
    return value


kyc["date_of_birth"] = kyc["date_of_birth"].apply(
    clean_date_of_birth
)



#city
kyc["city"] = (
    kyc["city"]
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
    "mumbay": "Mumbai",
    "bombay": "Mumbai",

    "kolkata": "Kolkata",
    "calcutta": "Kolkata",

    "pune": "Pune",
    "poona": "Pune",

    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "blr": "Bengaluru"
}

kyc["city"] = kyc["city"].map(city_map)




#state
kyc["state"] = (
    kyc["state"]
    .astype("string")
    .str.strip()
    .str.lower()
    .str.title()
)




# Income: ₹11,214 / 27.3k / INR 50000 → integer rupees. Negatives flipped
# with abs() (sign error). Unparseable values become NA, row is kept.


import re
import pandas as pd

raw_income = kyc["monthly_income"].copy()

def clean_monthly_income(value):
    if pd.isna(value):
        return pd.NA

    value = str(value).strip()

    if value == "":
        return value

    value = re.sub(r"₹|INR|Rs\.?", "", value, flags=re.IGNORECASE)
    value = value.replace(",", "").strip()

    if value.lower().endswith("k"):
        try:
            return int(float(value[:-1].strip()) * 1000)
        except ValueError:
            return value

    try:
        return int(float(value))
    except ValueError:
        return value

kyc["monthly_income"] = kyc["monthly_income"].apply(
    clean_monthly_income
)


kyc["monthly_income"] = pd.to_numeric(
    kyc["monthly_income"],
    errors="coerce"
).astype("Int64")

kyc["monthly_income"] = kyc["monthly_income"].abs()

kyc["monthly_income"] = kyc["monthly_income"].replace(
    "Not Available",
    pd.NA
)


#occupation
kyc["occupation"] = (
    kyc["occupation"]
    .astype("string")
    .str.strip()
    .str.title()
)



#kyc status


kyc["kyc_status"] = (
    kyc["kyc_status"]
    .astype("string")
    .str.strip()
    .str.lower()
)


kyc_status_map = {
    "done": "Approved",
    "verified": "Approved",
    "approved": "Approved",
    "v": "Approved",
    "kyc_done": "Approved",

    "rejected": "Rejected",
    "reject": "Rejected",
    "r": "Rejected",
    "failed": "Rejected",

    "pending": "Pending",
    "under review": "Pending",

    "in_progress": "In Progress",
    "p": "In Progress"
}

kyc["kyc_status"] = kyc["kyc_status"].map(kyc_status_map)




#risk segment

kyc["risk_segment"] = (
    kyc["risk_segment"]
    .astype("string")
    .str.strip()
    .str.lower()
)

kyc["risk_segment"] = kyc["risk_segment"].replace(
    "unknown",
    pd.NA
)




#sign_up timestamp
import pandas as pd
import re

raw_signup = kyc["signup_timestamp"].copy()

def clean_signup_timestamp(value):
    if pd.isna(value):
        return pd.NaT

    value = str(value).strip()

    if value == "":
        return pd.NaT

    # Unix timestamp
    if re.fullmatch(r"\d{10}", value):
        dt = pd.to_datetime(
            int(value),
            unit="s",
            errors="coerce"
        )

        if pd.notna(dt) and 1940 <= dt.year <= 2030:
            return dt.normalize()

        return value

    # Remove time
    date_part = value.split()[0]

    # DD-MMM-YY / DD-MMM-YYYY
    if re.fullmatch(r"\d{1,2}-[A-Za-z]{3}-\d{2,4}", date_part):
        dt = pd.to_datetime(
            date_part,
            format="%d-%b-%y",
            errors="coerce"
        )

        if pd.isna(dt):
            dt = pd.to_datetime(
                date_part,
                format="%d-%b-%Y",
                errors="coerce"
            )

        return dt.normalize() if pd.notna(dt) else value

    # Numeric dates
    match = re.fullmatch(
        r"(\d{1,2})-(\d{1,2})-(\d{2,4})",
        date_part
    )

    if match:
        a, b, year = match.groups()
        a = int(a)
        b = int(b)

        if a > 12:
            day, month = a, b
        elif b > 12:
            month, day = a, b
        else:
            day, month = a, b

        date_string = f"{day:02d}-{month:02d}-{year}"

        dt = pd.to_datetime(
            date_string,
            format="%d-%m-%y" if len(year) == 2 else "%d-%m-%Y",
            errors="coerce"
        )

        return dt.normalize() if pd.notna(dt) else value

    return value

kyc["signup_timestamp"] = kyc["signup_timestamp"].apply(
    clean_signup_timestamp
)


valid_dates = pd.to_datetime(
    kyc["signup_timestamp"],
    errors="coerce"
)

kyc["signup_timestamp"] = valid_dates.dt.strftime("%Y-%m-%d")




kyc = kyc.drop_duplicates().reset_index(drop=True)
N_KYC_CLEAN = len(kyc)
print(
    f"[KYC] cleaned rows: {N_KYC_CLEAN}  "
    f"(dropped {N_KYC_RAW - N_KYC_CLEAN} exact dups, "
    f"kept {N_KYC_CLEAN / N_KYC_RAW:.1%})"
)


# data type conversion

kyc["user_id"] = kyc["user_id"].astype("string")
kyc["full_name"] = kyc["full_name"].astype("string")
kyc["pan"] = kyc["pan"].astype("string")
kyc["aadhaar"] = kyc["aadhaar"].astype("string")

kyc["date_of_birth"] = pd.to_datetime(
    kyc["date_of_birth"],
    errors="coerce"
)

kyc["city"] = kyc["city"].astype("string")
kyc["state"] = kyc["state"].astype("string")

kyc["monthly_income"] = pd.to_numeric(
    kyc["monthly_income"],
    errors="coerce"
).astype("Int64")

kyc["occupation"] = kyc["occupation"].astype("string")

kyc["signup_timestamp"] = pd.to_datetime(
    kyc["signup_timestamp"],
    errors="coerce"
)

kyc["kyc_status"] = kyc["kyc_status"].astype("string")
kyc["risk_segment"] = kyc["risk_segment"].astype("string")



#move to precossed folder
PROCESSED_DIR = RAW_DIR.parent / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

kyc.to_csv(
    PROCESSED_DIR / "cleaned_kyc_records.csv",
    index=False
)

print("\nCleaned KYC records saved to:")
print(PROCESSED_DIR / "cleaned_kyc_records.csv")