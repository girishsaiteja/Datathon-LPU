import pandas as pd
from pathlib import Path

CURRENT_FILE = Path(__file__).resolve()

RAW_DIR = CURRENT_FILE.parents[2]
PROCESSED_DIR = RAW_DIR.parent / "processed"

merchants = pd.read_csv(
    PROCESSED_DIR / "cleaned_merchants_master.csv"
)

duplicate_ids = (
    merchants["merchant_id"]
    .value_counts()
)

duplicate_ids = duplicate_ids[
    duplicate_ids > 1
].index

print("\n================ DUPLICATE MERCHANT INSPECTION ================\n")

print("Duplicate merchant IDs:", len(duplicate_ids))

for merchant_id in list(duplicate_ids)[:20]:

    print("\n--------------------------------------------------")
    print("Merchant ID:", merchant_id)
    print("--------------------------------------------------")

    print(
        merchants[
            merchants["merchant_id"] == merchant_id
        ].to_string(index=False)
    )

print("\n================ COMPLETE ================\n")