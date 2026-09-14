import os
import pandas as pd
import psycopg
from dotenv import load_dotenv
from pathlib import Path


load_dotenv()

DATABASE_URL = os.getenv("SUPABASE_DB_URL")

CURRENT_FILE = Path(__file__).resolve()
PROCESSED_DIR = CURRENT_FILE.parents[2].parent / "processed"


TABLES = {
    "customer_risk_scores": {
        "file": "customer_risk_scores.csv",
        "columns": [
            "user_id",
            "full_name",
            "kyc_status",
            "risk_segment",
            "monthly_income",
            "occupation",
            "city",
            "state",
            "transaction_count",
            "transaction_amount",
            "average_transaction_value",
            "failed_transaction_count",
            "pending_transaction_count",
            "dispute_count",
            "disputed_amount",
            "high_severity_disputes",
            "critical_disputes",
            "failed_rate",
            "dispute_rate",
            "risk_score",
            "risk_level",
            "repeated_dispute_flag",
            "high_value_dispute_flag"
        ],
        "integer_columns": [
            "transaction_count",
            "failed_transaction_count",
            "pending_transaction_count",
            "dispute_count",
            "high_severity_disputes",
            "critical_disputes"
        ],
        "boolean_columns": [
            "repeated_dispute_flag",
            "high_value_dispute_flag"
        ]
    },

    "merchant_risk_scores": {
        "file": "merchant_risk_scores.csv",
        "columns": [
            "merchant_id",
            "merchant_name",
            "merchant_category",
            "business_type",
            "city",
            "state",
            "merchant_status",
            "declared_avg_ticket_size",
            "transaction_count",
            "transaction_amount",
            "average_transaction_value",
            "successful_transactions",
            "failed_transactions",
            "pending_transactions",
            "chargeback_count",
            "disputed_amount",
            "high_severity_chargebacks",
            "critical_chargebacks",
            "failed_rate",
            "chargeback_rate",
            "disputed_amount_rate",
            "risk_score",
            "risk_level",
            "repeated_chargeback_flag",
            "high_failed_rate_flag",
            "high_chargeback_rate_flag"
        ],
        "integer_columns": [
            "transaction_count",
            "successful_transactions",
            "failed_transactions",
            "pending_transactions",
            "chargeback_count",
            "high_severity_chargebacks",
            "critical_chargebacks"
        ],
        "boolean_columns": [
            "repeated_chargeback_flag",
            "high_failed_rate_flag",
            "high_chargeback_rate_flag"
        ]
    },

    "fraud_network_edges": {
        "file": "fraud_network_edges.csv",
        "columns": [
            "user_id",
            "merchant_id",
            "transaction_count",
            "transaction_amount",
            "failed_count",
            "chargeback_count",
            "disputed_amount",
            "failed_rate",
            "chargeback_rate",
            "edge_risk_score",
            "risk_level"
        ],
        "integer_columns": [
            "transaction_count",
            "failed_count",
            "chargeback_count"
        ],
        "boolean_columns": []
    },

    "fraud_clusters": {
        "file": "fraud_clusters.csv",
        "columns": [
            "cluster_id",
            "user_count",
            "merchant_count",
            "network_edge_count",
            "transaction_count",
            "transaction_amount",
            "failed_transaction_count",
            "failed_rate",
            "chargeback_count",
            "disputed_amount",
            "chargeback_rate",
            "high_risk_edges",
            "risk_score",
            "risk_level"
        ],
        "integer_columns": [
            "cluster_id",
            "user_count",
            "merchant_count",
            "network_edge_count",
            "transaction_count",
            "failed_transaction_count",
            "chargeback_count",
            "high_risk_edges"
        ],
        "boolean_columns": []
    },

    "fraud_cluster_members": {
        "file": "fraud_cluster_members.csv",
        "columns": [
            "cluster_id",
            "node_type",
            "entity_id"
        ],
        "integer_columns": [
            "cluster_id"
        ],
        "boolean_columns": []
    }
}


def prepare_dataframe(table_name, config):

    path = PROCESSED_DIR / config["file"]

    df = pd.read_csv(path)

    df = df[config["columns"]].copy()

    for column in config["integer_columns"]:

        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        ).astype("Int64")

    for column in config["boolean_columns"]:

        df[column] = (
            df[column]
            .astype("string")
            .str.strip()
            .str.lower()
            .map({
                "true": True,
                "false": False,
                "1": True,
                "0": False
            })
            .astype("boolean")
        )

    return df


def create_temp_csv(table_name, df):

    temp_path = (
        PROCESSED_DIR /
        f"_temp_{table_name}.csv"
    )

    df.to_csv(
        temp_path,
        index=False,
        na_rep=""
    )

    return temp_path


def load_table(conn, table_name, config):

    print(
        f"\nPreparing {table_name}..."
    )

    df = prepare_dataframe(
        table_name,
        config
    )

    print(
        f"Rows: {len(df)}"
    )

    temp_path = create_temp_csv(
        table_name,
        df
    )

    columns = config["columns"]

    column_list = ", ".join(columns)

    copy_sql = f"""
        COPY datathon.{table_name}
        ({column_list})
        FROM STDIN
        WITH (
            FORMAT CSV,
            HEADER TRUE,
            NULL ''
        )
    """

    try:

        with conn.cursor() as cur:

            print(
                f"Loading {table_name}..."
            )

            with cur.copy(copy_sql) as copy:

                with open(
                    temp_path,
                    "rb"
                ) as file:

                    while True:

                        chunk = file.read(
                            1024 * 1024
                        )

                        if not chunk:
                            break

                        copy.write(chunk)

        conn.commit()

        print(
            f"{table_name}: {len(df)} rows loaded successfully"
        )

    except Exception:

        conn.rollback()

        raise

    finally:

        if temp_path.exists():
            temp_path.unlink()


def truncate_tables(conn):

    print("\nClearing previous analytics data...")

    with conn.cursor() as cur:

        cur.execute("""
            TRUNCATE TABLE
                datathon.fraud_cluster_members,
                datathon.fraud_clusters,
                datathon.fraud_network_edges,
                datathon.merchant_risk_scores,
                datathon.customer_risk_scores;
        """)

    conn.commit()

    print("Previous analytics data cleared.")


def verify_counts(conn):

    print("\n" + "=" * 60)
    print("SUPABASE LOAD VERIFICATION")
    print("=" * 60)

    with conn.cursor() as cur:

        for table_name in TABLES:

            cur.execute(
                f"""
                SELECT COUNT(*)
                FROM datathon.{table_name}
                """
            )

            count = cur.fetchone()[0]

            print(
                f"{table_name}: {count} rows"
            )


def main():

    if not DATABASE_URL:

        raise ValueError(
            "SUPABASE_DB_URL not found in .env"
        )

    print("Connecting to Supabase...")

    with psycopg.connect(
        DATABASE_URL,
        prepare_threshold=None
    ) as conn:

        print("Connected successfully.")

        truncate_tables(conn)

        for table_name, config in TABLES.items():

            load_table(
                conn,
                table_name,
                config
            )

        verify_counts(conn)

    print(
        "\nAll advanced analytics tables loaded successfully."
    )


if __name__ == "__main__":
    main()