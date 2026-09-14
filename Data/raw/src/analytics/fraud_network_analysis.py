import pandas as pd
import networkx as nx
from pathlib import Path


CURRENT_FILE = Path(__file__).resolve()
PROCESSED_DIR = CURRENT_FILE.parents[2].parent / "processed"


transactions = pd.read_csv(
    PROCESSED_DIR / "fact_transactions.csv"
)

chargebacks = pd.read_csv(
    PROCESSED_DIR / "fact_chargebacks.csv"
)


transactions = transactions.dropna(
    subset=["user_id", "merchant_id"]
)

chargebacks = chargebacks.dropna(
    subset=["user_id", "merchant_id"]
)


transaction_edges = (
    transactions
    .groupby(["user_id", "merchant_id"], as_index=False)
    .agg(
        transaction_count=("txn_id", "count"),
        transaction_amount=("amount", "sum"),
        failed_count=("status", lambda x: (x == "Failed").sum())
    )
)


chargeback_edges = (
    chargebacks
    .groupby(["user_id", "merchant_id"], as_index=False)
    .agg(
        chargeback_count=("complaint_id", "count"),
        disputed_amount=("disputed_amount", "sum")
    )
)


edges = transaction_edges.merge(
    chargeback_edges,
    on=["user_id", "merchant_id"],
    how="outer"
)


numeric_columns = [
    "transaction_count",
    "transaction_amount",
    "failed_count",
    "chargeback_count",
    "disputed_amount"
]


for column in numeric_columns:
    edges[column] = edges[column].fillna(0)


edges["failed_rate"] = (
    edges["failed_count"]
    / edges["transaction_count"].replace(0, pd.NA)
    * 100
).fillna(0)


edges["chargeback_rate"] = (
    edges["chargeback_count"]
    / edges["transaction_count"].replace(0, pd.NA)
    * 100
).fillna(0)


edges["edge_risk_score"] = 0


edges["edge_risk_score"] += (
    edges["chargeback_count"].clip(upper=5) * 10
)


edges["edge_risk_score"] += (
    edges["failed_count"].clip(upper=10) * 2
)


edges.loc[
    edges["chargeback_count"] >= 1,
    "edge_risk_score"
] += 15


edges.loc[
    edges["chargeback_count"] >= 2,
    "edge_risk_score"
] += 15


edges.loc[
    edges["chargeback_rate"] >= 5,
    "edge_risk_score"
] += 20


edges.loc[
    edges["chargeback_rate"] >= 10,
    "edge_risk_score"
] += 15


edges.loc[
    edges["failed_rate"] >= 20,
    "edge_risk_score"
] += 10


edges.loc[
    edges["disputed_amount"] >= 10000,
    "edge_risk_score"
] += 10


edges.loc[
    edges["disputed_amount"] >= 25000,
    "edge_risk_score"
] += 15


edges["edge_risk_score"] = (
    edges["edge_risk_score"]
    .clip(upper=100)
)


edges["risk_level"] = "Low"

edges.loc[
    edges["edge_risk_score"] >= 25,
    "risk_level"
] = "Medium"

edges.loc[
    edges["edge_risk_score"] >= 50,
    "risk_level"
] = "High"

edges.loc[
    edges["edge_risk_score"] >= 70,
    "risk_level"
] = "Critical"


edges.to_csv(
    PROCESSED_DIR / "fraud_network_edges.csv",
    index=False
)


G = nx.Graph()


for _, row in edges.iterrows():

    user_node = f"USER_{row['user_id']}"
    merchant_node = f"MERCHANT_{row['merchant_id']}"

    G.add_node(
        user_node,
        node_type="user",
        entity_id=row["user_id"]
    )

    G.add_node(
        merchant_node,
        node_type="merchant",
        entity_id=row["merchant_id"]
    )

    G.add_edge(
        user_node,
        merchant_node,
        transaction_count=row["transaction_count"],
        transaction_amount=row["transaction_amount"],
        failed_count=row["failed_count"],
        chargeback_count=row["chargeback_count"],
        disputed_amount=row["disputed_amount"],
        failed_rate=row["failed_rate"],
        chargeback_rate=row["chargeback_rate"],
        edge_risk_score=row["edge_risk_score"],
        risk_level=row["risk_level"]
    )


clusters = []
cluster_members = []


for cluster_number, component in enumerate(
    nx.connected_components(G),
    start=1
):

    if len(component) < 2:
        continue

    subgraph = G.subgraph(component)

    users = [
        node for node in subgraph.nodes
        if subgraph.nodes[node]["node_type"] == "user"
    ]

    merchants = [
        node for node in subgraph.nodes
        if subgraph.nodes[node]["node_type"] == "merchant"
    ]


    transaction_count = sum(
        data.get("transaction_count", 0)
        for _, _, data in subgraph.edges(data=True)
    )


    transaction_amount = sum(
        data.get("transaction_amount", 0)
        for _, _, data in subgraph.edges(data=True)
    )


    failed_transaction_count = sum(
        data.get("failed_count", 0)
        for _, _, data in subgraph.edges(data=True)
    )


    chargeback_count = sum(
        data.get("chargeback_count", 0)
        for _, _, data in subgraph.edges(data=True)
    )


    disputed_amount = sum(
        data.get("disputed_amount", 0)
        for _, _, data in subgraph.edges(data=True)
    )


    high_risk_edges = sum(
        data.get("risk_level") in ["High", "Critical"]
        for _, _, data in subgraph.edges(data=True)
    )


    failed_rate = (
        failed_transaction_count
        / transaction_count
        * 100
        if transaction_count > 0
        else 0
    )


    chargeback_rate = (
        chargeback_count
        / transaction_count
        * 100
        if transaction_count > 0
        else 0
    )


    risk_score = 0


    risk_score += min(chargeback_count, 10) * 5

    risk_score += min(high_risk_edges, 5) * 5


    if chargeback_rate >= 5:
        risk_score += 20


    if failed_rate >= 20:
        risk_score += 10


    if disputed_amount >= 25000:
        risk_score += 10


    if len(users) >= 5:
        risk_score += 10


    if len(merchants) >= 3:
        risk_score += 5


    risk_score = min(risk_score, 100)


    if risk_score >= 70:
        risk_level = "Critical"
    elif risk_score >= 50:
        risk_level = "High"
    elif risk_score >= 25:
        risk_level = "Medium"
    else:
        risk_level = "Low"


    clusters.append({
        "cluster_id": cluster_number,
        "user_count": len(users),
        "merchant_count": len(merchants),
        "network_edge_count": subgraph.number_of_edges(),
        "transaction_count": transaction_count,
        "transaction_amount": transaction_amount,
        "failed_transaction_count": failed_transaction_count,
        "failed_rate": failed_rate,
        "chargeback_count": chargeback_count,
        "disputed_amount": disputed_amount,
        "chargeback_rate": chargeback_rate,
        "high_risk_edges": high_risk_edges,
        "risk_score": risk_score,
        "risk_level": risk_level
    })


    for node in component:

        cluster_members.append({
            "cluster_id": cluster_number,
            "node_type": subgraph.nodes[node]["node_type"],
            "entity_id": subgraph.nodes[node]["entity_id"]
        })


clusters_df = pd.DataFrame(clusters)

cluster_members_df = pd.DataFrame(
    cluster_members
)


clusters_df.to_csv(
    PROCESSED_DIR / "fraud_clusters.csv",
    index=False
)


cluster_members_df.to_csv(
    PROCESSED_DIR / "fraud_cluster_members.csv",
    index=False
)


print("Fraud network analysis completed")
print("Network nodes:", G.number_of_nodes())
print("Network edges:", G.number_of_edges())
print("Clusters:", len(clusters_df))


if len(clusters_df) > 0:
    print(
        "High/Critical clusters:",
        clusters_df["risk_level"]
        .isin(["High", "Critical"])
        .sum()
    )


print(
    "High/Critical edges:",
    edges["risk_level"]
    .isin(["High", "Critical"])
    .sum()
)


print(
    "Network edges output:",
    PROCESSED_DIR / "fraud_network_edges.csv"
)

print(
    "Clusters output:",
    PROCESSED_DIR / "fraud_clusters.csv"
)

print(
    "Cluster members output:",
    PROCESSED_DIR / "fraud_cluster_members.csv"
)