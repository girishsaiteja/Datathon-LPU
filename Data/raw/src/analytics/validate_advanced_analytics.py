import pandas as pd
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()
PROCESSED_DIR = CURRENT_FILE.parents[2].parent / "processed"


def load_file(file_name):
    path = PROCESSED_DIR / file_name
    df = pd.read_csv(path)

    print(f"\n{'=' * 60}")
    print(file_name)
    print(f"{'=' * 60}")
    print("Rows:", len(df))
    print("Columns:", len(df.columns))
    print("Column names:")
    print(list(df.columns))
    print("Total missing values:", df.isna().sum().sum())

    return df


customers = load_file("customer_risk_scores.csv")
merchants = load_file("merchant_risk_scores.csv")
edges = load_file("fraud_network_edges.csv")
clusters = load_file("fraud_clusters.csv")
members = load_file("fraud_cluster_members.csv")


print("\n" + "=" * 60)
print("CUSTOMER RISK VALIDATION")
print("=" * 60)

print("Duplicate user_id:", customers["user_id"].duplicated().sum())

if "risk_level" in customers.columns:
    print("\nRisk levels:")
    print(customers["risk_level"].value_counts(dropna=False))

if "risk_score" in customers.columns:
    print("\nRisk score:")
    print(customers["risk_score"].describe())

if "dispute_count" in customers.columns:
    print("\nCustomers with disputes:")
    print((customers["dispute_count"] > 0).sum())

if "dispute_count" in customers.columns:
    print("Customers with repeated disputes:")
    print((customers["dispute_count"] >= 2).sum())

if "disputed_amount" in customers.columns:
    print("Customers with high-value disputes:")
    print((customers["disputed_amount"] >= 25000).sum())


print("\n" + "=" * 60)
print("MERCHANT RISK VALIDATION")
print("=" * 60)

print("Duplicate merchant_id:", merchants["merchant_id"].duplicated().sum())

if "risk_level" in merchants.columns:
    print("\nRisk levels:")
    print(merchants["risk_level"].value_counts(dropna=False))

if "risk_score" in merchants.columns:
    print("\nRisk score:")
    print(merchants["risk_score"].describe())

if "chargeback_count" in merchants.columns:
    print("\nMerchants with chargebacks:")
    print((merchants["chargeback_count"] > 0).sum())

if "chargeback_count" in merchants.columns:
    print("Merchants with repeated chargebacks:")
    print((merchants["chargeback_count"] >= 3).sum())

if "failed_rate" in merchants.columns:
    print("Merchants with failed rate >= 20%:")
    print((merchants["failed_rate"] >= 20).sum())

if "chargeback_rate" in merchants.columns:
    print("Merchants with chargeback rate >= 5%:")
    print((merchants["chargeback_rate"] >= 5).sum())


print("\n" + "=" * 60)
print("FRAUD NETWORK VALIDATION")
print("=" * 60)

edge_duplicates = edges.duplicated(
    subset=["user_id", "merchant_id"]
).sum()

print("Duplicate user-merchant edges:", edge_duplicates)

if "risk_level" in edges.columns:
    print("\nRisk levels:")
    print(edges["risk_level"].value_counts(dropna=False))

if "risk_score" in edges.columns:
    print("\nRisk score:")
    print(edges["risk_score"].describe())

if "chargeback_count" in edges.columns:
    print("\nEdges with chargebacks:")
    print((edges["chargeback_count"] > 0).sum())

if "risk_level" in edges.columns:
    print("High/Critical edges:")
    print(
        edges["risk_level"]
        .isin(["High", "Critical"])
        .sum()
    )


print("\n" + "=" * 60)
print("FRAUD CLUSTER VALIDATION")
print("=" * 60)

print("Duplicate cluster_id:", clusters["cluster_id"].duplicated().sum())

if "risk_level" in clusters.columns:
    print("\nRisk levels:")
    print(clusters["risk_level"].value_counts(dropna=False))

if "risk_score" in clusters.columns:
    print("\nRisk score:")
    print(clusters["risk_score"].describe())

if "risk_level" in clusters.columns:
    print("\nHigh/Critical clusters:")
    print(
        clusters["risk_level"]
        .isin(["High", "Critical"])
        .sum()
    )

if "network_edge_count" in clusters.columns:
    print("\nCluster size:")
    print(clusters["network_edge_count"].describe())


print("\n" + "=" * 60)
print("CLUSTER MEMBERS VALIDATION")
print("=" * 60)

print("Columns:", list(members.columns))

if "cluster_id" in members.columns:
    print("Unique clusters:", members["cluster_id"].nunique())

for column in ["node", "node_id", "member_id"]:
    if column in members.columns:
        print("Unique", column + ":", members[column].nunique())

if "node_type" in members.columns:
    print("\nNode types:")
    print(members["node_type"].value_counts(dropna=False))


print("\n" + "=" * 60)
print("VALIDATION COMPLETED")
print("=" * 60)