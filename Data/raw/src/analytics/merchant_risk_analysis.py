"""
Per-merchant risk rollup.

Join dim_merchant to fact_transactions + fact_chargebacks. Rates are
failed/chargeback counts over txn count. Flags mark repeat chargebacks and
high rates so the dashboard can sort without re-aggregating in the browser.
"""

from pathlib import Path
import pandas as pd



CURRENT_FILE = Path(__file__).resolve()
RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"


TRANSACTIONS_FILE = PROCESSED_DIR / "fact_transactions.csv"
CHARGEBACKS_FILE = PROCESSED_DIR / "fact_chargebacks.csv"
MERCHANTS_FILE = PROCESSED_DIR / "dim_merchant.csv"


transactions = pd.read_csv(TRANSACTIONS_FILE)
chargebacks = pd.read_csv(CHARGEBACKS_FILE)
merchants = pd.read_csv(MERCHANTS_FILE)


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
    .groupby("merchant_id")
    .agg(
        transaction_count=("txn_id", "count"),
        transaction_amount=("amount", "sum"),
        average_transaction_value=("amount", "mean"),
        successful_transactions=(
            "status",
            lambda x: (x == "Success").sum()
        ),
        failed_transactions=(
            "status",
            lambda x: (x == "Failed").sum()
        ),
        pending_transactions=(
            "status",
            lambda x: (x == "Pending").sum()
        )
    )
    .reset_index()
)


chargeback_metrics = (
    chargebacks
    .groupby("merchant_id")
    .agg(
        chargeback_count=("complaint_id", "count"),
        disputed_amount=("disputed_amount", "sum"),
        high_severity_chargebacks=(
            "severity",
            lambda x: x.isin(["High", "Critical"]).sum()
        ),
        critical_chargebacks=(
            "severity",
            lambda x: (x == "Critical").sum()
        )
    )
    .reset_index()
)


merchant_risk = merchants[
    [
        "merchant_id",
        "merchant_name",
        "merchant_category",
        "business_type",
        "city",
        "state",
        "merchant_status",
        "declared_avg_ticket_size"
    ]
].copy()


merchant_risk = merchant_risk.merge(
    transaction_metrics,
    on="merchant_id",
    how="left"
)

merchant_risk = merchant_risk.merge(
    chargeback_metrics,
    on="merchant_id",
    how="left"
)


numeric_columns = [
    "transaction_count",
    "transaction_amount",
    "average_transaction_value",
    "successful_transactions",
    "failed_transactions",
    "pending_transactions",
    "chargeback_count",
    "disputed_amount",
    "high_severity_chargebacks",
    "critical_chargebacks"
]


for column in numeric_columns:
    merchant_risk[column] = (
        pd.to_numeric(
            merchant_risk[column],
            errors="coerce"
        )
        .fillna(0)
    )


merchant_risk["failed_rate"] = (
    100
    * merchant_risk["failed_transactions"]
    / merchant_risk["transaction_count"].replace(0, pd.NA)
)

merchant_risk["failed_rate"] = (
    merchant_risk["failed_rate"]
    .fillna(0)
    .round(2)
)


merchant_risk["chargeback_rate"] = (
    100
    * merchant_risk["chargeback_count"]
    / merchant_risk["transaction_count"].replace(0, pd.NA)
)

merchant_risk["chargeback_rate"] = (
    merchant_risk["chargeback_rate"]
    .fillna(0)
    .round(2)
)


merchant_risk["disputed_amount_rate"] = (
    100
    * merchant_risk["disputed_amount"]
    / merchant_risk["transaction_amount"].replace(0, pd.NA)
)

merchant_risk["disputed_amount_rate"] = (
    merchant_risk["disputed_amount_rate"]
    .fillna(0)
    .round(2)
)


merchant_risk["risk_score"] = (
    merchant_risk["chargeback_count"].clip(upper=10) * 5
    + merchant_risk["high_severity_chargebacks"].clip(upper=5) * 5
    + merchant_risk["critical_chargebacks"].clip(upper=3) * 10
    + (merchant_risk["chargeback_rate"] >= 5).astype(int) * 20
    + (merchant_risk["failed_rate"] >= 20).astype(int) * 10
    + (merchant_risk["disputed_amount"] >= 50000).astype(int) * 10
)


merchant_risk["risk_score"] = (
    merchant_risk["risk_score"]
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


merchant_risk["risk_level"] = (
    merchant_risk["risk_score"]
    .apply(assign_risk_level)
)


merchant_risk["repeated_chargeback_flag"] = (
    merchant_risk["chargeback_count"] >= 3
)


merchant_risk["high_failed_rate_flag"] = (
    merchant_risk["failed_rate"] >= 20
)


merchant_risk["high_chargeback_rate_flag"] = (
    merchant_risk["chargeback_rate"] >= 5
)


merchant_risk = merchant_risk.sort_values(
    [
        "risk_score",
        "disputed_amount",
        "chargeback_count"
    ],
    ascending=False
)


OUTPUT_FILE = (
    PROCESSED_DIR /
    "merchant_risk_scores.csv"
)


merchant_risk.to_csv(
    OUTPUT_FILE,
    index=False
)


print("Merchant risk analysis completed")
print("Merchants analyzed:", len(merchant_risk))
print("High-risk merchants:", (
    merchant_risk["risk_level"]
    .isin(["High", "Critical"])
    .sum()
))
print("Merchants with repeated chargebacks:", (
    merchant_risk["repeated_chargeback_flag"].sum()
))
print("Output:", OUTPUT_FILE)