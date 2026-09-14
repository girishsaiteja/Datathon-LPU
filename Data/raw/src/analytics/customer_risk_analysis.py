from pathlib import Path
import pandas as pd


CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"


TRANSACTIONS_FILE = PROCESSED_DIR / "fact_transactions.csv"
CHARGEBACKS_FILE = PROCESSED_DIR / "fact_chargebacks.csv"
CUSTOMERS_FILE = PROCESSED_DIR / "dim_customer.csv"


transactions = pd.read_csv(TRANSACTIONS_FILE)
chargebacks = pd.read_csv(CHARGEBACKS_FILE)
customers = pd.read_csv(CUSTOMERS_FILE)


transactions["amount"] = pd.to_numeric(
    transactions["amount"],
    errors="coerce"
).fillna(0)

chargebacks["disputed_amount"] = pd.to_numeric(
    chargebacks["disputed_amount"],
    errors="coerce"
).fillna(0)


transaction_metrics = (
    transactions
    .groupby("user_id")
    .agg(
        transaction_count=("txn_id", "count"),
        transaction_amount=("amount", "sum"),
        average_transaction_value=("amount", "mean"),
        failed_transaction_count=(
            "status",
            lambda x: (x == "Failed").sum()
        ),
        pending_transaction_count=(
            "status",
            lambda x: (x == "Pending").sum()
        )
    )
    .reset_index()
)


chargeback_metrics = (
    chargebacks
    .groupby("user_id")
    .agg(
        dispute_count=("complaint_id", "count"),
        disputed_amount=("disputed_amount", "sum"),
        high_severity_disputes=(
            "severity",
            lambda x: x.isin(["High", "Critical"]).sum()
        ),
        critical_disputes=(
            "severity",
            lambda x: (x == "Critical").sum()
        )
    )
    .reset_index()
)


customer_risk = customers[
    [
        "user_id",
        "full_name",
        "kyc_status",
        "risk_segment",
        "monthly_income",
        "occupation",
        "city",
        "state"
    ]
].copy()


customer_risk = customer_risk.merge(
    transaction_metrics,
    on="user_id",
    how="left"
)

customer_risk = customer_risk.merge(
    chargeback_metrics,
    on="user_id",
    how="left"
)


numeric_columns = [
    "transaction_count",
    "transaction_amount",
    "average_transaction_value",
    "failed_transaction_count",
    "pending_transaction_count",
    "dispute_count",
    "disputed_amount",
    "high_severity_disputes",
    "critical_disputes"
]


for column in numeric_columns:
    customer_risk[column] = (
        pd.to_numeric(
            customer_risk[column],
            errors="coerce"
        )
        .fillna(0)
    )


customer_risk["failed_rate"] = (
    100
    * customer_risk["failed_transaction_count"]
    / customer_risk["transaction_count"].replace(0, pd.NA)
)

customer_risk["failed_rate"] = (
    customer_risk["failed_rate"]
    .fillna(0)
    .round(2)
)


customer_risk["dispute_rate"] = (
    100
    * customer_risk["dispute_count"]
    / customer_risk["transaction_count"].replace(0, pd.NA)
)

customer_risk["dispute_rate"] = (
    customer_risk["dispute_rate"]
    .fillna(0)
    .round(2)
)


customer_risk["risk_score"] = (
    customer_risk["dispute_count"].clip(upper=10) * 5
    + customer_risk["high_severity_disputes"].clip(upper=5) * 5
    + customer_risk["critical_disputes"].clip(upper=3) * 10
    + (customer_risk["failed_rate"] >= 20).astype(int) * 10
    + (customer_risk["disputed_amount"] >= 25000).astype(int) * 10
    + (customer_risk["transaction_amount"] >= 100000).astype(int) * 5
    + (customer_risk["risk_segment"] == "High").astype(int) * 20
)


customer_risk["risk_score"] = (
    customer_risk["risk_score"]
    .clip(upper=100)
    .round(2)
)


def assign_risk_level(score):
    if score >= 70:
        return "Critical"
    elif score >= 50:
        return "High"
    elif score >= 25:
        return "Medium"
    return "Low"


customer_risk["risk_level"] = (
    customer_risk["risk_score"]
    .apply(assign_risk_level)
)


customer_risk["repeated_dispute_flag"] = (
    customer_risk["dispute_count"] >= 2
)


customer_risk["high_value_dispute_flag"] = (
    customer_risk["disputed_amount"] >= 25000
)


customer_risk = customer_risk.sort_values(
    [
        "risk_score",
        "disputed_amount",
        "dispute_count"
    ],
    ascending=False
)


OUTPUT_FILE = (
    PROCESSED_DIR /
    "customer_risk_scores.csv"
)


customer_risk.to_csv(
    OUTPUT_FILE,
    index=False
)


print("Customer risk analysis completed")
print("Customers analyzed:", len(customer_risk))
print("High-risk customers:", (
    customer_risk["risk_level"]
    .isin(["High", "Critical"])
    .sum()
))
print("Customers with repeated disputes:", (
    customer_risk["repeated_dispute_flag"].sum()
))
print("Output:", OUTPUT_FILE)