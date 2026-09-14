CREATE INDEX idx_transactions_user
ON datathon.fact_transactions(user_id);


CREATE INDEX idx_transactions_merchant
ON datathon.fact_transactions(merchant_id);


CREATE INDEX idx_transactions_timestamp
ON datathon.fact_transactions(timestamp);


CREATE INDEX idx_transactions_status
ON datathon.fact_transactions(status);


CREATE INDEX idx_chargebacks_txn
ON datathon.fact_chargebacks(txn_id);


CREATE INDEX idx_chargebacks_user
ON datathon.fact_chargebacks(user_id);


CREATE INDEX idx_chargebacks_merchant
ON datathon.fact_chargebacks(merchant_id);


CREATE INDEX idx_chargebacks_reason
ON datathon.fact_chargebacks(reason_code);


CREATE INDEX idx_chargebacks_severity
ON datathon.fact_chargebacks(severity);


CREATE INDEX idx_chargebacks_reported
ON datathon.fact_chargebacks(reported_timestamp);