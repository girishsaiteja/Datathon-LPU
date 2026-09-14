from pathlib import Path
import pandas as pd

CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"


def normalize_id(series):
    return (
        series.astype("string")
        .str.strip()
        .str.upper()
        .str.replace(r"[\s_-]", "", regex=True)
    )


transactions = pd.read_csv(
    PROCESSED_DIR / "cleaned_upi_transactions.csv",
    dtype={
        "txn_id": "string",
        "user_id": "string",
        "merchant_id": "string"
    }
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "cleaned_chargebacks.csv",
    dtype={
        "complaint_id": "string",
        "txn_id": "string",
        "user_id": "string",
        "merchant_id": "string"
    }
)

customers = pd.read_csv(
    PROCESSED_DIR / "dim_customer.csv",
    dtype={"user_id": "string"}
)

merchants = pd.read_csv(
    PROCESSED_DIR / "dim_merchant.csv",
    dtype={"merchant_id": "string"}
)


for df in [transactions, chargebacks, customers, merchants]:
    for column in ["txn_id", "user_id", "merchant_id"]:
        if column in df.columns:
            df[column] = normalize_id(df[column])


customer_ids = set(customers["user_id"].dropna())
merchant_ids = set(merchants["merchant_id"].dropna())
transaction_ids = set(transactions["txn_id"].dropna())


transactions["customer_match_status"] = transactions[
    "user_id"
].isin(customer_ids).map({
    True: "Matched",
    False: "Unmatched"
})

transactions["merchant_match_status"] = transactions[
    "merchant_id"
].isin(merchant_ids).map({
    True: "Matched",
    False: "Unmatched"
})


chargebacks["customer_match_status"] = chargebacks[
    "user_id"
].isin(customer_ids).map({
    True: "Matched",
    False: "Unmatched"
})

chargebacks["merchant_match_status"] = chargebacks[
    "merchant_id"
].isin(merchant_ids).map({
    True: "Matched",
    False: "Unmatched"
})

chargebacks["transaction_match_status"] = chargebacks[
    "txn_id"
].isin(transaction_ids).map({
    True: "Matched",
    False: "Unmatched"
})


transaction_lookup = transactions.set_index("txn_id")[
    ["user_id", "merchant_id"]
]


chargebacks["transaction_user_id"] = chargebacks[
    "txn_id"
].map(transaction_lookup["user_id"])

chargebacks["transaction_merchant_id"] = chargebacks[
    "txn_id"
].map(transaction_lookup["merchant_id"])


chargebacks["user_consistency_status"] = "Not Applicable"

matched_txn = chargebacks["transaction_match_status"] == "Matched"

chargebacks.loc[
    matched_txn &
    (chargebacks["user_id"] == chargebacks["transaction_user_id"]),
    "user_consistency_status"
] = "Matched"

chargebacks.loc[
    matched_txn &
    (chargebacks["user_id"] != chargebacks["transaction_user_id"]),
    "user_consistency_status"
] = "Mismatch"


chargebacks["merchant_consistency_status"] = "Not Applicable"

chargebacks.loc[
    matched_txn &
    (
        chargebacks["merchant_id"]
        == chargebacks["transaction_merchant_id"]
    ),
    "merchant_consistency_status"
] = "Matched"

chargebacks.loc[
    matched_txn &
    (
        chargebacks["merchant_id"]
        != chargebacks["transaction_merchant_id"]
    ),
    "merchant_consistency_status"
] = "Mismatch"


transactions.to_csv(
    PROCESSED_DIR / "fact_transactions.csv",
    index=False
)

chargebacks.to_csv(
    PROCESSED_DIR / "fact_chargebacks.csv",
    index=False
)


print("Fact tables created")
print()
print("fact_transactions:", len(transactions))
print("fact_chargebacks:", len(chargebacks))
print()
print(
    "Transaction customer unmatched:",
    (transactions["customer_match_status"] == "Unmatched").sum()
)

print(
    "Transaction merchant unmatched:",
    (transactions["merchant_match_status"] == "Unmatched").sum()
)

print(
    "Chargeback customer unmatched:",
    (chargebacks["customer_match_status"] == "Unmatched").sum()
)

print(
    "Chargeback merchant unmatched:",
    (chargebacks["merchant_match_status"] == "Unmatched").sum()
)

print(
    "Chargeback transaction unmatched:",
    (chargebacks["transaction_match_status"] == "Unmatched").sum()
)

print(
    "Chargeback user mismatch:",
    (chargebacks["user_consistency_status"] == "Mismatch").sum()
)

print(
    "Chargeback merchant mismatch:",
    (chargebacks["merchant_consistency_status"] == "Mismatch").sum()
)