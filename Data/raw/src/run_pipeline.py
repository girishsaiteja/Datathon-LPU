"""
Run the warehouse pipeline top to bottom.

    python Data/raw/src/run_pipeline.py

Order: clean → unique dims → facts → risk / fraud tables.
Each cleaning script prints raw vs cleaned counts.
"""

from pathlib import Path
import runpy

SRC = Path(__file__).resolve().parent
CLEAN = SRC / "cleaning"
MODEL = SRC / "modeling"
ANALYTICS = SRC / "analytics"

steps = [
    CLEAN / "clean upi_trans and merchants_master.py",
    CLEAN / "clean kyc_records.py",
    CLEAN / "clean chargebacks.py",
    MODEL / "create_unique_customers.py",
    MODEL / "create_unique_merchants.py",
    MODEL / "build_fact_tables.py",
    ANALYTICS / "customer_risk_analysis.py",
    ANALYTICS / "merchant_risk_analysis.py",
    ANALYTICS / "fraud_network_analysis.py",
    CLEAN / "prove_row_counts.py",
]

for i, path in enumerate(steps, start=1):
    print("\n" + "=" * 78)
    print(f"[{i}/{len(steps)}] {path.name}")
    print("=" * 78)
    runpy.run_path(str(path), run_name="__main__")

print("\nPipeline finished. Cleaned files are in Data/processed/")
