CREATE TABLE IF NOT EXISTS datathon.customer_risk_scores (
    user_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(255),
    kyc_status VARCHAR(30),
    risk_segment VARCHAR(30),
    monthly_income NUMERIC(15,2),
    occupation VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    transaction_count INTEGER,
    transaction_amount NUMERIC(18,2),
    average_transaction_value NUMERIC(18,2),
    failed_transaction_count INTEGER,
    pending_transaction_count INTEGER,
    dispute_count INTEGER,
    disputed_amount NUMERIC(18,2),
    high_severity_disputes INTEGER,
    critical_disputes INTEGER,
    failed_rate NUMERIC(10,2),
    dispute_rate NUMERIC(10,2),
    risk_score NUMERIC(10,2),
    risk_level VARCHAR(20),
    repeated_dispute_flag BOOLEAN,
    high_value_dispute_flag BOOLEAN
);


CREATE TABLE IF NOT EXISTS datathon.merchant_risk_scores (
    merchant_id VARCHAR(20) PRIMARY KEY,
    merchant_name VARCHAR(255),
    merchant_category VARCHAR(100),
    business_type VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    merchant_status VARCHAR(30),
    declared_avg_ticket_size NUMERIC(18,2),
    transaction_count INTEGER,
    transaction_amount NUMERIC(18,2),
    average_transaction_value NUMERIC(18,2),
    successful_transactions INTEGER,
    failed_transactions INTEGER,
    pending_transactions INTEGER,
    chargeback_count INTEGER,
    disputed_amount NUMERIC(18,2),
    high_severity_chargebacks INTEGER,
    critical_chargebacks INTEGER,
    failed_rate NUMERIC(10,2),
    chargeback_rate NUMERIC(10,2),
    disputed_amount_rate NUMERIC(10,2),
    risk_score NUMERIC(10,2),
    risk_level VARCHAR(20),
    repeated_chargeback_flag BOOLEAN,
    high_failed_rate_flag BOOLEAN,
    high_chargeback_rate_flag BOOLEAN
);


CREATE TABLE IF NOT EXISTS datathon.fraud_network_edges (
    user_id VARCHAR(20) NOT NULL,
    merchant_id VARCHAR(20) NOT NULL,
    transaction_count INTEGER,
    transaction_amount NUMERIC(18,2),
    failed_count INTEGER,
    chargeback_count INTEGER,
    disputed_amount NUMERIC(18,2),
    failed_rate NUMERIC(10,2),
    chargeback_rate NUMERIC(10,2),
    edge_risk_score NUMERIC(10,2),
    risk_level VARCHAR(20),
    PRIMARY KEY (user_id, merchant_id)
);


CREATE TABLE IF NOT EXISTS datathon.fraud_clusters (
    cluster_id INTEGER PRIMARY KEY,
    user_count INTEGER,
    merchant_count INTEGER,
    network_edge_count INTEGER,
    transaction_count INTEGER,
    transaction_amount NUMERIC(18,2),
    failed_transaction_count INTEGER,
    failed_rate NUMERIC(10,2),
    chargeback_count INTEGER,
    disputed_amount NUMERIC(18,2),
    chargeback_rate NUMERIC(10,2),
    high_risk_edges INTEGER,
    risk_score NUMERIC(10,2),
    risk_level VARCHAR(20)
);


CREATE TABLE IF NOT EXISTS datathon.fraud_cluster_members (
    cluster_id INTEGER NOT NULL,
    node_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(30) NOT NULL,
    PRIMARY KEY (cluster_id, node_type, entity_id)
);