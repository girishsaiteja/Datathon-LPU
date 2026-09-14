import pandas as pd
import json
from pathlib import Path


# Project paths
CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]


# Load datasets
def load_transactions():
    return pd.read_csv(RAW_DIR / "track1_upi_transactions.csv")


def load_kyc():
    return pd.read_csv(RAW_DIR / "track1_kyc_records.csv")


def load_merchants():
    return pd.read_csv(RAW_DIR / "track1_merchants_master.csv")


def load_chargebacks():
    file_path = RAW_DIR / "track1_chargebacks.json"

    with open(file_path, "r", encoding="utf-8") as file:
        data = json.load(file)

    return pd.json_normalize(data)


# Profile datasets
def profile_data(name, df):
    print("\n" + "=" * 70)
    print(f"DATASET: {name}")
    print("=" * 70)

    print("Rows:", len(df))
    print("Columns:", len(df.columns))

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nData Types:")
    print(df.dtypes)

    print("\nMissing Values:")
    print(df.isnull().sum())

    print("\nDuplicate Rows:")
    print(df.duplicated().sum())

    print("\nFirst 5 Rows:")
    print(df.head())


def main():
    print("\n" + "=" * 70)
    print("TRANSORG AGENTIQ - TRACK 1")
    print("UPI FRAUD RING & MERCHANT ANALYTICS")
    print("=" * 70)

    print("\nRaw data directory:")
    print(RAW_DIR)

    print("\nLoading datasets...")

    transactions = load_transactions()
    kyc = load_kyc()
    merchants = load_merchants()
    chargebacks = load_chargebacks()

    print("\nAll datasets loaded successfully!")

    profile_data("UPI Transactions", transactions)
    profile_data("KYC Records", kyc)
    profile_data("Merchant Master", merchants)
    profile_data("Chargebacks", chargebacks)

    print("\n" + "=" * 70)
    print("INGESTION + PROFILING COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    main()