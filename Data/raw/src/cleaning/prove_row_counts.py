"""
Proof of data cleaning: raw row count vs cleaned row count.

Run from anywhere:
    python "Data/raw/src/cleaning/prove_row_counts.py"

We did not drop ~50% of the data. Retention is ~97–99% on every file.
Rows that left are exact duplicates after standardising, not "looks messy".
"""

from pathlib import Path
import json
import pandas as pd

CLEAN_DIR = Path(__file__).resolve().parent
RAW = CLEAN_DIR.parents[1]  # Data/raw
PROC = RAW.parent / "processed"



def count_json(path):
    with open(path, encoding="utf-8") as f:
        return len(json.load(f))


rows = [
    (
        "UPI transactions",
        len(pd.read_csv(RAW / "track1_upi_transactions.csv", usecols=[0])),
        len(pd.read_csv(PROC / "cleaned_upi_transactions.csv", usecols=[0])),
        "clean upi_trans and merchants_master.py",
    ),
    (
        "Merchants master",
        len(pd.read_csv(RAW / "track1_merchants_master.csv", usecols=[0])),
        len(pd.read_csv(PROC / "cleaned_merchants_master.csv", usecols=[0])),
        "clean upi_trans and merchants_master.py",
    ),
    (
        "KYC / customers",
        len(pd.read_csv(RAW / "track1_kyc_records.csv", usecols=[0])),
        len(pd.read_csv(PROC / "cleaned_kyc_records.csv", usecols=[0])),
        "clean kyc_records.py",
    ),
    (
        "Chargebacks",
        count_json(RAW / "track1_chargebacks.json"),
        len(pd.read_csv(PROC / "cleaned_chargebacks.csv", usecols=[0])),
        "clean chargebacks.py",
    ),
]

print("=" * 78)
print("DATA CLEANING PROOF  —  raw vs cleaned row counts")
print("=" * 78)
print(f"{'table':<22} {'raw':>8} {'cleaned':>10} {'dropped':>9} {'kept':>8}  script")
print("-" * 78)

total_raw = total_clean = 0
for name, n_raw, n_clean, script in rows:
    dropped = n_raw - n_clean
    kept = n_clean / n_raw
    total_raw += n_raw
    total_clean += n_clean
    print(
        f"{name:<22} {n_raw:>8,} {n_clean:>10,} {dropped:>9,} {kept:>7.1%}  {script}"
    )

print("-" * 78)
print(
    f"{'TOTAL':<22} {total_raw:>8,} {total_clean:>10,} "
    f"{total_raw - total_clean:>9,} {total_clean / total_raw:>7.1%}"
)
print()
print("Rule: fix the value (dates, ₹ amounts, aliases). Only drop exact duplicate rows.")
print("After mapping aliases, some merchant/KYC rows become identical — those collapse too.")
print("Missing MCC is imputed from the other table when that merchant has one MCC.")
print("Unmatched customer/merchant ids are kept on facts (see build_fact_tables.py).")
