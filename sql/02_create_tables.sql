CREATE TABLE datathon.dim_customer (
    user_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(255),
    pan VARCHAR(20),
    aadhaar VARCHAR(20),
    date_of_birth DATE,
    city VARCHAR(100),
    state VARCHAR(100),
    monthly_income NUMERIC(15,2),
    occupation VARCHAR(100),
    signup_timestamp TIMESTAMP,
    kyc_status VARCHAR(30),
    risk_segment VARCHAR(30)
);


CREATE TABLE datathon.dim_merchant (
    merchant_key BIGSERIAL PRIMARY KEY,
    merchant_id VARCHAR(20) UNIQUE NOT NULL,
    merchant_name VARCHAR(255),
    mcc INTEGER,
    merchant_category VARCHAR(100),
    business_type VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    onboarding_date DATE,
    settlement_account VARCHAR(100),
    merchant_status VARCHAR(30),
    declared_avg_ticket_size NUMERIC(15,2)
);


CREATE TABLE datathon.fact_transactions (
    txn_id VARCHAR(30) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    merchant_id VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP,
    amount NUMERIC(15,2),
    utr VARCHAR(30),
    mcc INTEGER,
    status VARCHAR(30),
    customer_match_status VARCHAR(20),
    merchant_match_status VARCHAR(20)
);


CREATE TABLE datathon.fact_chargebacks (
    complaint_id VARCHAR(30) PRIMARY KEY,
    txn_id VARCHAR(30),
    user_id VARCHAR(20) NOT NULL,
    merchant_id VARCHAR(20) NOT NULL,
    transaction_timestamp TIMESTAMP,
    reported_timestamp TIMESTAMP,
    disputed_amount NUMERIC(15,2),
    reason_code VARCHAR(100),
    complaint_text TEXT,
    resolution_status VARCHAR(50),
    bank_response_timestamp TIMESTAMP,
    severity VARCHAR(30),
    channel VARCHAR(50),

    customer_match_status VARCHAR(20),
    merchant_match_status VARCHAR(20),
    transaction_match_status VARCHAR(20),

    transaction_user_id VARCHAR(20),
    transaction_merchant_id VARCHAR(20),

    user_consistency_status VARCHAR(30),
    merchant_consistency_status VARCHAR(30)
);  