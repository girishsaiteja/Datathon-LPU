

-- 1. RELATIONSHIP INDEXES


CREATE INDEX IF NOT EXISTS idx_dim_customer_user_id
ON datathon.dim_customer(user_id);

CREATE INDEX IF NOT EXISTS idx_dim_merchant_merchant_id
ON datathon.dim_merchant(merchant_id);

CREATE INDEX IF NOT EXISTS idx_fact_transactions_user_id
ON datathon.fact_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_fact_transactions_merchant_id
ON datathon.fact_transactions(merchant_id);

CREATE INDEX IF NOT EXISTS idx_fact_transactions_txn_id
ON datathon.fact_transactions(txn_id);

CREATE INDEX IF NOT EXISTS idx_fact_chargebacks_user_id
ON datathon.fact_chargebacks(user_id);

CREATE INDEX IF NOT EXISTS idx_fact_chargebacks_merchant_id
ON datathon.fact_chargebacks(merchant_id);

CREATE INDEX IF NOT EXISTS idx_fact_chargebacks_txn_id
ON datathon.fact_chargebacks(txn_id);


-- =========================================
-- 2. TRANSACTION → CUSTOMER
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_transaction_customer AS
SELECT
    ft.*,
    dc.full_name,
    dc.pan,
    dc.aadhaar,
    dc.date_of_birth,
    dc.city AS customer_city,
    dc.state AS customer_state,
    dc.monthly_income,
    dc.occupation,
    dc.signup_timestamp,
    dc.kyc_status,
    dc.risk_segment
FROM datathon.fact_transactions ft
LEFT JOIN datathon.dim_customer dc
    ON ft.user_id = dc.user_id;


-- =========================================
-- 3. TRANSACTION → MERCHANT
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_transaction_merchant AS
SELECT
    ft.*,
    dm.merchant_name,
    dm.mcc AS merchant_mcc,
    dm.merchant_category,
    dm.business_type,
    dm.city AS merchant_city,
    dm.state AS merchant_state,
    dm.onboarding_date,
    dm.merchant_status,
    dm.declared_avg_ticket_size
FROM datathon.fact_transactions ft
LEFT JOIN datathon.dim_merchant dm
    ON ft.merchant_id = dm.merchant_id;


-- =========================================
-- 4. CHARGEBACK → TRANSACTION
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_transaction AS
SELECT
    fc.*,
    ft.amount AS transaction_amount,
    ft.status AS transaction_status,
    ft.timestamp AS actual_transaction_timestamp,
    ft.user_id AS actual_transaction_user_id,
    ft.merchant_id AS actual_transaction_merchant_id,
    ft.utr AS transaction_utr,
    ft.mcc AS transaction_mcc
FROM datathon.fact_chargebacks fc
LEFT JOIN datathon.fact_transactions ft
    ON fc.txn_id = ft.txn_id;


-- =========================================
-- 5. CHARGEBACK → CUSTOMER
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_customer AS
SELECT
    fc.*,
    dc.full_name,
    dc.pan,
    dc.aadhaar,
    dc.date_of_birth,
    dc.city AS customer_city,
    dc.state AS customer_state,
    dc.monthly_income,
    dc.occupation,
    dc.signup_timestamp,
    dc.kyc_status,
    dc.risk_segment
FROM datathon.fact_chargebacks fc
LEFT JOIN datathon.dim_customer dc
    ON fc.user_id = dc.user_id;


-- =========================================
-- 6. CHARGEBACK → MERCHANT
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_merchant AS
SELECT
    fc.*,
    dm.merchant_name,
    dm.mcc AS merchant_mcc,
    dm.merchant_category,
    dm.business_type,
    dm.city AS merchant_city,
    dm.state AS merchant_state,
    dm.onboarding_date,
    dm.merchant_status,
    dm.declared_avg_ticket_size
FROM datathon.fact_chargebacks fc
LEFT JOIN datathon.dim_merchant dm
    ON fc.merchant_id = dm.merchant_id;


-- =========================================
-- 7. COMPLETE CHARGEBACK RELATIONSHIP
-- =========================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_complete AS
SELECT
    fc.complaint_id,
    fc.txn_id,

    fc.user_id,
    fc.merchant_id,

    fc.transaction_timestamp,
    fc.reported_timestamp,
    fc.disputed_amount,

    fc.reason_code,
    fc.complaint_text,
    fc.resolution_status,
    fc.bank_response_timestamp,
    fc.severity,
    fc.channel,

    dc.full_name,
    dc.kyc_status,
    dc.risk_segment,
    dc.monthly_income,
    dc.occupation,

    dm.merchant_name,
    dm.merchant_category,
    dm.business_type,
    dm.mcc AS merchant_mcc,
    dm.city AS merchant_city,
    dm.state AS merchant_state,
    dm.merchant_status,

    ft.amount AS transaction_amount,
    ft.status AS transaction_status,
    ft.timestamp AS actual_transaction_timestamp,

    fc.customer_match_status,
    fc.merchant_match_status,
    fc.transaction_match_status,
    fc.user_consistency_status,
    fc.merchant_consistency_status

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.dim_customer dc
    ON fc.user_id = dc.user_id

LEFT JOIN datathon.dim_merchant dm
    ON fc.merchant_id = dm.merchant_id

LEFT JOIN datathon.fact_transactions ft
    ON fc.txn_id = ft.txn_id;