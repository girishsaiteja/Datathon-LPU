CREATE OR REPLACE VIEW datathon.vw_utr_risk_analysis AS

WITH txn AS (
    SELECT
        user_id,
        COUNT(*) AS transaction_count,
        SUM(amount) AS transaction_amount,
        COUNT(*) FILTER (WHERE status = 'Failed') AS failed_transactions,
        COUNT(*) FILTER (WHERE status = 'Success') AS successful_transactions,
        COUNT(*) FILTER (
            WHERE utr IS NULL OR TRIM(utr) = ''
        ) AS missing_utr_transactions
    FROM datathon.fact_transactions
    GROUP BY user_id
),

cb AS (
    SELECT
        user_id,
        COUNT(*) AS chargeback_count,
        COALESCE(SUM(disputed_amount), 0) AS disputed_amount
    FROM datathon.fact_chargebacks
    GROUP BY user_id
)

SELECT
    t.user_id,
    t.transaction_count,
    t.transaction_amount,
    t.failed_transactions,
    t.successful_transactions,
    t.missing_utr_transactions,
    ROUND(
        t.missing_utr_transactions::numeric
        / NULLIF(t.transaction_count, 0) * 100,
        2
    ) AS missing_utr_rate,
    COALESCE(c.chargeback_count, 0) AS chargeback_count,
    COALESCE(c.disputed_amount, 0) AS disputed_amount
FROM txn t
LEFT JOIN cb c
    ON t.user_id = c.user_id;



CREATE OR REPLACE VIEW datathon.vw_utr_status_analysis AS

SELECT
    CASE
        WHEN utr IS NULL OR TRIM(utr) = '' THEN 'Missing UTR'
        ELSE 'UTR Available'
    END AS utr_status,
    COUNT(*) AS transaction_count,
    SUM(amount) AS transaction_amount,
    ROUND(
        AVG(amount),
        2
    ) AS average_transaction_value,
    COUNT(*) FILTER (
        WHERE status = 'Failed'
    ) AS failed_transactions,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'Failed')::numeric
        / NULLIF(COUNT(*), 0) * 100,
        2
    ) AS failed_rate
FROM datathon.fact_transactions
GROUP BY
    CASE
        WHEN utr IS NULL OR TRIM(utr) = '' THEN 'Missing UTR'
        ELSE 'UTR Available'
    END;




CREATE OR REPLACE VIEW datathon.vw_kyc_risk_analysis AS

WITH txn AS (
    SELECT
        user_id,
        COUNT(*) AS transaction_count,
        SUM(amount) AS transaction_amount,
        AVG(amount) AS average_transaction_value,
        COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) AS failed_transactions
    FROM datathon.fact_transactions
    GROUP BY user_id
),

cb AS (
    SELECT
        user_id,
        COUNT(*) AS chargeback_count,
        COALESCE(SUM(disputed_amount), 0) AS disputed_amount
    FROM datathon.fact_chargebacks
    GROUP BY user_id
)

SELECT
    c.user_id,
    c.kyc_status,
    c.risk_segment,
    COALESCE(t.transaction_count, 0) AS transaction_count,
    COALESCE(t.transaction_amount, 0) AS transaction_amount,
    ROUND(
        COALESCE(t.average_transaction_value, 0),
        2
    ) AS average_transaction_value,
    COALESCE(t.failed_transactions, 0) AS failed_transactions,
    COALESCE(cb.chargeback_count, 0) AS chargeback_count,
    COALESCE(cb.disputed_amount, 0) AS disputed_amount
FROM datathon.dim_customer c
LEFT JOIN txn t
    ON c.user_id = t.user_id
LEFT JOIN cb
    ON c.user_id = cb.user_id;



CREATE OR REPLACE VIEW datathon.vw_kyc_risk_summary AS

WITH txn AS (
    SELECT
        user_id,
        COUNT(*) AS transaction_count,
        SUM(amount) AS transaction_amount,
        COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) AS failed_transactions
    FROM datathon.fact_transactions
    GROUP BY user_id
),

cb AS (
    SELECT
        user_id,
        COUNT(*) AS chargeback_count,
        COALESCE(SUM(disputed_amount), 0) AS disputed_amount
    FROM datathon.fact_chargebacks
    GROUP BY user_id
)

SELECT
    c.kyc_status,
    c.risk_segment,

    COUNT(*) AS customer_count,

    COALESCE(SUM(t.transaction_count), 0)
        AS transaction_count,

    ROUND(
        COALESCE(SUM(t.transaction_amount), 0),
        2
    ) AS transaction_amount,

    COALESCE(SUM(t.failed_transactions), 0)
        AS failed_transactions,

    COALESCE(SUM(cb.chargeback_count), 0)
        AS chargeback_count,

    ROUND(
        COALESCE(SUM(cb.disputed_amount), 0),
        2
    ) AS disputed_amount

FROM datathon.dim_customer c

LEFT JOIN txn t
    ON c.user_id = t.user_id

LEFT JOIN cb
    ON c.user_id = cb.user_id

GROUP BY
    c.kyc_status,
    c.risk_segment

ORDER BY
    customer_count DESC;