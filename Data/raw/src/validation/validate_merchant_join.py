import pandas as pd
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

merchants = pd.read_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv"
)

transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv"
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv"
)

print("\n--- MERCHANT JOIN IMPACT ---")

merchant_counts = (
    merchants["merchant_id"]
    .value_counts()
)

print(
    "Unique merchant IDs in master:",
    merchants["merchant_id"].nunique()
)

print(
    "Merchant IDs appearing more than once:",
    (merchant_counts > 1).sum()
)

print(
    "Merchant rows with duplicate IDs:",
    merchants["merchant_id"].duplicated(keep=False).sum()
)


# Transactions affected by duplicate merchant IDs

txn_duplicate_merchant = transactions[
    transactions["merchant_id"].isin(
        merchant_counts[merchant_counts > 1].index
    )
]

print(
    "\nTransactions using duplicate merchant IDs:",
    len(txn_duplicate_merchant)
)


# Chargebacks affected by duplicate merchant IDs

cb_duplicate_merchant = chargebacks[
    chargebacks["merchant_id"].isin(
        merchant_counts[merchant_counts > 1].index
    )
]

print(
    "Chargebacks using duplicate merchant IDs:",
    len(cb_duplicate_merchant)
)


# Simulate transaction merge

txn_merged = transactions.merge(
    merchants[["merchant_id"]],
    on="merchant_id",
    how="left"
)

print(
    "\nTransactions before merge:",
    len(transactions)
)

print(
    "Transactions after merge:",
    len(txn_merged)
)

print(
    "Extra rows created by merge:",
    len(txn_merged) - len(transactions)
)


# Simulate chargeback merge

cb_merged = chargebacks.merge(
    merchants[["merchant_id"]],
    on="merchant_id",
    how="left"
)

print(
    "\nChargebacks before merge:",
    len(chargebacks)
)

print(
    "Chargebacks after merge:",
    len(cb_merged)
)

print(
    "Extra rows created by merge:",
    len(cb_merged) - len(chargebacks)
)


print("\n================ COMPLETE ================\n")



print("\n--- MERCHANT_ID + MCC UNIQUENESS ---")

merchant_mcc = (
    merchants
    .dropna(subset=["merchant_id", "mcc"])
    .groupby("merchant_id")["mcc"]
    .nunique()
)

print(
    "Merchant IDs with exactly one MCC:",
    (merchant_mcc == 1).sum()
)

print(
    "Merchant IDs with multiple MCCs:",
    (merchant_mcc > 1).sum()
)

print(
    "Merchant IDs with no MCC:",
    (merchant_mcc == 0).sum()
)


# Check duplicate merchant_id + MCC combinations

pair_counts = (
    merchants
    .dropna(subset=["merchant_id", "mcc"])
    .groupby(["merchant_id", "mcc"])
    .size()
)

print(
    "\nUnique merchant_id + MCC combinations:",
    len(pair_counts)
)

print(
    "Repeated merchant_id + MCC combinations:",
    (pair_counts > 1).sum()
)

print(
    "Rows involved in repeated merchant_id + MCC:",
    pair_counts[pair_counts > 1].sum()
)


print("\n--- TRANSACTION MERCHANT-MCC MATCH ---")

merchant_lookup = (
    merchants[
        ["merchant_id", "mcc"]
    ]
    .dropna()
    .drop_duplicates()
)

txn_pairs = (
    transactions[
        ["merchant_id", "mcc"]
    ]
    .dropna()
    .drop_duplicates()
)

matched_pairs = txn_pairs.merge(
    merchant_lookup,
    on=["merchant_id", "mcc"],
    how="inner"
)

print("Unique transaction merchant+MCC pairs:", len(txn_pairs))
print("Matched merchant+MCC pairs:", len(matched_pairs))

print(
    "Unmatched merchant+MCC pairs:",
    len(txn_pairs) - len(matched_pairs)
)

print(
    "Transaction rows with merchant+MCC:",
    len(
        transactions[
            transactions["merchant_id"].notna()
            & transactions["mcc"].notna()
        ]
    )
)