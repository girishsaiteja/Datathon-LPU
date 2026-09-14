-- =========================================================
-- 05_CREATE_ANALYTICS_VIEWS.SQL
-- UPI Fraud Ring & Merchant Analytics
-- =========================================================


-- =========================================================
-- 1. OVERALL EXECUTIVE KPIs
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_overall_kpis AS
SELECT
    COUNT(*) AS total_transaction_count,

    COALESCE(SUM(amount), 0) AS total_transaction_amount,

    COALESCE(AVG(amount), 0) AS average_transaction_value,

    COUNT(*) FILTER (
        WHERE status = 'Failed'
    ) AS failed_transaction_count,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS failed_transaction_rate,

    COUNT(*) FILTER (
        WHERE status = 'Pending'
    ) AS pending_transaction_count,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'Pending'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS pending_transaction_rate,

    COUNT(*) FILTER (
        WHERE status = 'Success'
    ) AS successful_transaction_count,

    COUNT(*) FILTER (
        WHERE utr IS NULL
    ) AS missing_utr_count,

    COUNT(*) FILTER (
        WHERE utr IS NOT NULL
        AND utr !~ '^UTR[0-9]{10}$'
    ) AS invalid_utr_count

FROM datathon.fact_transactions;


-- =========================================================
-- 2. CHARGEBACK KPIs
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_kpis AS
SELECT
    COUNT(*) AS chargeback_count,

    COALESCE(
        SUM(disputed_amount),
        0
    ) AS chargeback_amount,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*)
             FROM datathon.fact_transactions),
            0
        ),
        2
    ) AS chargeback_to_transaction_ratio,

    ROUND(
        100.0 * COALESCE(SUM(disputed_amount), 0)
        / NULLIF(
            (SELECT SUM(amount)
             FROM datathon.fact_transactions),
            0
        ),
        2
    ) AS disputed_amount_to_transaction_amount_ratio

FROM datathon.fact_chargebacks;


-- =========================================================
-- 3. DAILY TRANSACTION TREND
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_daily_transaction_trend AS
SELECT
    DATE(timestamp) AS transaction_date,

    COUNT(*) AS transaction_count,

    COALESCE(SUM(amount), 0) AS transaction_amount,

    COALESCE(AVG(amount), 0) AS average_transaction_value,

    COUNT(*) FILTER (
        WHERE status = 'Success'
    ) AS successful_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Failed'
    ) AS failed_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Pending'
    ) AS pending_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Processing'
    ) AS processing_transactions,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS failed_rate

FROM datathon.fact_transactions

WHERE timestamp IS NOT NULL

GROUP BY DATE(timestamp)

ORDER BY transaction_date;


-- =========================================================
-- 4. HOURLY TRANSACTION / FAILED TRANSACTION TREND
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_hourly_transaction_trend AS
SELECT
    EXTRACT(HOUR FROM timestamp)::INTEGER AS transaction_hour,

    COUNT(*) AS total_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Success'
    ) AS successful_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Failed'
    ) AS failed_transactions,

    COUNT(*) FILTER (
        WHERE status = 'Pending'
    ) AS pending_transactions,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS failed_rate

FROM datathon.fact_transactions

WHERE timestamp IS NOT NULL

GROUP BY EXTRACT(HOUR FROM timestamp)::INTEGER

ORDER BY transaction_hour;


-- =========================================================
-- 5. TRANSACTION STATUS DISTRIBUTION
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_transaction_status_distribution AS
SELECT
    status,

    COUNT(*) AS transaction_count,

    COALESCE(
        SUM(amount),
        0
    ) AS transaction_amount,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*)
             FROM datathon.fact_transactions),
            0
        ),
        2
    ) AS percentage

FROM datathon.fact_transactions

GROUP BY status

ORDER BY transaction_count DESC;


-- =========================================================
-- 6. MERCHANT CATEGORY PERFORMANCE
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_merchant_category_performance AS
SELECT
    COALESCE(
        dm.merchant_category,
        'Unknown'
    ) AS merchant_category,

    COUNT(ft.txn_id) AS transaction_count,

    COALESCE(
        SUM(ft.amount),
        0
    ) AS transaction_amount,

    COALESCE(
        AVG(ft.amount),
        0
    ) AS average_transaction_value,

    COUNT(ft.txn_id) FILTER (
        WHERE ft.status = 'Success'
    ) AS successful_transactions,

    COUNT(ft.txn_id) FILTER (
        WHERE ft.status = 'Failed'
    ) AS failed_transactions,

    COUNT(ft.txn_id) FILTER (
        WHERE ft.status = 'Pending'
    ) AS pending_transactions,

    ROUND(
        100.0 * COUNT(ft.txn_id) FILTER (
            WHERE ft.status = 'Failed'
        ) / NULLIF(COUNT(ft.txn_id), 0),
        2
    ) AS failed_rate

FROM datathon.fact_transactions ft

LEFT JOIN datathon.dim_merchant dm
    ON ft.merchant_id = dm.merchant_id

GROUP BY
    COALESCE(
        dm.merchant_category,
        'Unknown'
    )

ORDER BY transaction_amount DESC;


-- =========================================================
-- 7. CHARGEBACK METRICS BY MERCHANT CATEGORY
--    Separate aggregation prevents double counting
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_category_chargeback_metrics AS
WITH transaction_metrics AS (
    SELECT
        COALESCE(
            dm.merchant_category,
            'Unknown'
        ) AS merchant_category,

        COUNT(*) AS transaction_count,

        COALESCE(
            SUM(ft.amount),
            0
        ) AS transaction_amount

    FROM datathon.fact_transactions ft

    LEFT JOIN datathon.dim_merchant dm
        ON ft.merchant_id = dm.merchant_id

    GROUP BY
        COALESCE(
            dm.merchant_category,
            'Unknown'
        )
),

chargeback_metrics AS (
    SELECT
        COALESCE(
            dm.merchant_category,
            'Unknown'
        ) AS merchant_category,

        COUNT(*) AS chargeback_count,

        COALESCE(
            SUM(fc.disputed_amount),
            0
        ) AS disputed_amount

    FROM datathon.fact_chargebacks fc

    LEFT JOIN datathon.dim_merchant dm
        ON fc.merchant_id = dm.merchant_id

    GROUP BY
        COALESCE(
            dm.merchant_category,
            'Unknown'
        )
)

SELECT
    COALESCE(
        tm.merchant_category,
        cm.merchant_category
    ) AS merchant_category,

    COALESCE(
        tm.transaction_count,
        0
    ) AS transaction_count,

    COALESCE(
        tm.transaction_amount,
        0
    ) AS transaction_amount,

    COALESCE(
        cm.chargeback_count,
        0
    ) AS chargeback_count,

    COALESCE(
        cm.disputed_amount,
        0
    ) AS disputed_amount,

    ROUND(
        100.0 * COALESCE(
            cm.chargeback_count,
            0
        )
        / NULLIF(
            COALESCE(tm.transaction_count, 0),
            0
        ),
        2
    ) AS chargeback_to_transaction_ratio

FROM transaction_metrics tm

FULL OUTER JOIN chargeback_metrics cm
    ON tm.merchant_category = cm.merchant_category

ORDER BY chargeback_to_transaction_ratio DESC;


-- =========================================================
-- 8. MERCHANT METRICS
--    Transactions and chargebacks aggregated separately
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_merchant_metrics AS
WITH transaction_metrics AS (
    SELECT
        merchant_id,

        COUNT(*) AS transaction_count,

        COALESCE(
            SUM(amount),
            0
        ) AS transaction_amount,

        COALESCE(
            AVG(amount),
            0
        ) AS average_transaction_value,

        COUNT(*) FILTER (
            WHERE status = 'Success'
        ) AS successful_transactions,

        COUNT(*) FILTER (
            WHERE status = 'Failed'
        ) AS failed_transactions,

        ROUND(
            100.0 * COUNT(*) FILTER (
                WHERE status = 'Failed'
            ) / NULLIF(COUNT(*), 0),
            2
        ) AS failed_rate

    FROM datathon.fact_transactions

    GROUP BY merchant_id
),

chargeback_metrics AS (
    SELECT
        merchant_id,

        COUNT(*) AS chargeback_count,

        COALESCE(
            SUM(disputed_amount),
            0
        ) AS disputed_amount

    FROM datathon.fact_chargebacks

    GROUP BY merchant_id
)

SELECT
    dm.merchant_id,

    dm.merchant_name,

    dm.merchant_category,

    dm.business_type,

    dm.city,

    dm.state,

    dm.merchant_status,

    COALESCE(
        tm.transaction_count,
        0
    ) AS transaction_count,

    COALESCE(
        tm.transaction_amount,
        0
    ) AS transaction_amount,

    COALESCE(
        tm.average_transaction_value,
        0
    ) AS average_transaction_value,

    COALESCE(
        tm.successful_transactions,
        0
    ) AS successful_transactions,

    COALESCE(
        tm.failed_transactions,
        0
    ) AS failed_transactions,

    COALESCE(
        tm.failed_rate,
        0
    ) AS failed_rate,

    COALESCE(
        cm.chargeback_count,
        0
    ) AS chargeback_count,

    COALESCE(
        cm.disputed_amount,
        0
    ) AS disputed_amount,

    ROUND(
        100.0 * COALESCE(
            cm.chargeback_count,
            0
        )
        / NULLIF(
            COALESCE(tm.transaction_count, 0),
            0
        ),
        2
    ) AS chargeback_rate

FROM datathon.dim_merchant dm

LEFT JOIN transaction_metrics tm
    ON dm.merchant_id = tm.merchant_id

LEFT JOIN chargeback_metrics cm
    ON dm.merchant_id = cm.merchant_id

ORDER BY chargeback_count DESC;


-- =========================================================
-- 9. TOP MERCHANTS BY CHARGEBACK COUNT
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_top_merchants_chargebacks AS
SELECT
    merchant_id,

    merchant_name,

    merchant_category,

    city,

    state,

    transaction_count,

    chargeback_count,

    disputed_amount,

    chargeback_rate

FROM datathon.vw_merchant_metrics

WHERE chargeback_count > 0

ORDER BY
    chargeback_count DESC,
    disputed_amount DESC;


-- =========================================================
-- 10. TOP MERCHANTS BY DISPUTED AMOUNT
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_top_merchants_disputed_amount AS
SELECT
    merchant_id,

    merchant_name,

    merchant_category,

    city,

    state,

    transaction_count,

    chargeback_count,

    disputed_amount,

    chargeback_rate

FROM datathon.vw_merchant_metrics

WHERE disputed_amount > 0

ORDER BY
    disputed_amount DESC,
    chargeback_count DESC;


-- =========================================================
-- 11. CHARGEBACK REASON DISTRIBUTION
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_reason_distribution AS
SELECT
    reason_code,

    COUNT(*) AS chargeback_count,

    COALESCE(
        SUM(disputed_amount),
        0
    ) AS disputed_amount,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*)
             FROM datathon.fact_chargebacks),
            0
        ),
        2
    ) AS percentage_of_chargebacks

FROM datathon.fact_chargebacks

GROUP BY reason_code

ORDER BY chargeback_count DESC;


-- =========================================================
-- 12. DISPUTE SEVERITY DISTRIBUTION
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_dispute_severity_distribution AS
SELECT
    severity,

    COUNT(*) AS chargeback_count,

    COALESCE(
        SUM(disputed_amount),
        0
    ) AS disputed_amount,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*)
             FROM datathon.fact_chargebacks),
            0
        ),
        2
    ) AS percentage_of_chargebacks

FROM datathon.fact_chargebacks

GROUP BY severity

ORDER BY
    CASE severity
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Medium' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
    END;


-- =========================================================
-- 13. DAILY CHARGEBACK TREND
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_daily_chargeback_trend AS
SELECT
    DATE(reported_timestamp) AS reported_date,

    COUNT(*) AS chargeback_count,

    COALESCE(
        SUM(disputed_amount),
        0
    ) AS disputed_amount,

    COUNT(*) FILTER (
        WHERE severity IN ('High', 'Critical')
    ) AS high_severity_chargebacks

FROM datathon.fact_chargebacks

WHERE reported_timestamp IS NOT NULL

GROUP BY DATE(reported_timestamp)

ORDER BY reported_date;


-- =========================================================
-- 14. KYC STATUS DISTRIBUTION
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_kyc_status_distribution AS
SELECT
    kyc_status,

    COUNT(*) AS customer_count,

    ROUND(
        100.0 * COUNT(*)
        / NULLIF(
            (SELECT COUNT(*)
             FROM datathon.dim_customer),
            0
        ),
        2
    ) AS percentage

FROM datathon.dim_customer

GROUP BY kyc_status

ORDER BY customer_count DESC;


-- =========================================================
-- 15. KYC KPIs
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_kyc_kpis AS
SELECT
    COUNT(*) AS total_customers,

    COUNT(*) FILTER (
        WHERE kyc_status = 'Approved'
    ) AS approved_customers,

    COUNT(*) FILTER (
        WHERE kyc_status = 'Rejected'
    ) AS rejected_customers,

    COUNT(*) FILTER (
        WHERE kyc_status = 'Pending'
    ) AS pending_customers,

    COUNT(*) FILTER (
        WHERE kyc_status = 'In Progress'
    ) AS in_progress_customers,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE kyc_status = 'Approved'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS kyc_completion_rate,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE kyc_status = 'Rejected'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS kyc_rejection_rate

FROM datathon.dim_customer;


-- =========================================================
-- 16. HIGH-RISK USERS
--    Transaction and dispute metrics aggregated separately
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_high_risk_users AS
WITH transaction_metrics AS (
    SELECT
        user_id,

        COUNT(*) AS transaction_count,

        COALESCE(
            SUM(amount),
            0
        ) AS transaction_amount

    FROM datathon.fact_transactions

    GROUP BY user_id
),

chargeback_metrics AS (
    SELECT
        user_id,

        COUNT(*) AS dispute_count,

        COALESCE(
            SUM(disputed_amount),
            0
        ) AS disputed_amount

    FROM datathon.fact_chargebacks

    GROUP BY user_id
)

SELECT
    dc.user_id,

    dc.full_name,

    dc.kyc_status,

    dc.risk_segment,

    dc.monthly_income,

    COALESCE(
        tm.transaction_count,
        0
    ) AS transaction_count,

    COALESCE(
        tm.transaction_amount,
        0
    ) AS transaction_amount,

    COALESCE(
        cm.dispute_count,
        0
    ) AS dispute_count,

    COALESCE(
        cm.disputed_amount,
        0
    ) AS disputed_amount

FROM datathon.dim_customer dc

LEFT JOIN transaction_metrics tm
    ON dc.user_id = tm.user_id

LEFT JOIN chargeback_metrics cm
    ON dc.user_id = cm.user_id

WHERE
    dc.risk_segment = 'High'
    OR COALESCE(cm.dispute_count, 0) >= 2

ORDER BY
    disputed_amount DESC,
    dispute_count DESC;


-- =========================================================
-- 17. USERS WITH REPEATED DISPUTES
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_users_repeated_disputes AS
SELECT
    dc.user_id,

    dc.full_name,

    dc.risk_segment,

    dc.kyc_status,

    COUNT(fc.complaint_id) AS dispute_count,

    COALESCE(
        SUM(fc.disputed_amount),
        0
    ) AS disputed_amount,

    COUNT(*) FILTER (
        WHERE fc.severity = 'Critical'
    ) AS critical_disputes,

    COUNT(*) FILTER (
        WHERE fc.severity = 'High'
    ) AS high_severity_disputes

FROM datathon.dim_customer dc

INNER JOIN datathon.fact_chargebacks fc
    ON dc.user_id = fc.user_id

GROUP BY
    dc.user_id,
    dc.full_name,
    dc.risk_segment,
    dc.kyc_status

HAVING COUNT(fc.complaint_id) >= 2

ORDER BY
    dispute_count DESC,
    disputed_amount DESC;


-- =========================================================
-- 18. HIGH-RISK MERCHANTS
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_high_risk_merchants AS
SELECT
    merchant_id,

    merchant_name,

    merchant_category,

    business_type,

    city,

    state,

    merchant_status,

    transaction_count,

    transaction_amount,

    average_transaction_value,

    successful_transactions,

    failed_transactions,

    failed_rate,

    chargeback_count,

    disputed_amount,

    chargeback_rate,

    CASE
        WHEN chargeback_rate >= 10
             AND failed_rate >= 20
            THEN 'Critical'

        WHEN chargeback_rate >= 5
             OR chargeback_count >= 3
            THEN 'High'

        WHEN failed_rate >= 20
            THEN 'Medium'

        ELSE 'Normal'
    END AS risk_level

FROM datathon.vw_merchant_metrics

WHERE
    transaction_count >= 10

    AND (
        chargeback_rate >= 5
        OR chargeback_count >= 3
        OR failed_rate >= 20
    )

ORDER BY
    CASE
        WHEN chargeback_rate >= 10
             AND failed_rate >= 20
            THEN 1
        WHEN chargeback_rate >= 5
             OR chargeback_count >= 3
            THEN 2
        WHEN failed_rate >= 20
            THEN 3
        ELSE 4
    END,

    chargeback_rate DESC,

    disputed_amount DESC;


-- =========================================================
-- 19. HIGH-VALUE CHARGEBACKS
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_high_value_chargebacks AS
SELECT
    fc.complaint_id,

    fc.txn_id,

    fc.user_id,

    fc.merchant_id,

    fc.disputed_amount,

    fc.reason_code,

    fc.severity,

    fc.resolution_status,

    fc.reported_timestamp,

    dc.full_name,

    dc.risk_segment,

    dm.merchant_name,

    dm.merchant_category

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.dim_customer dc
    ON fc.user_id = dc.user_id

LEFT JOIN datathon.dim_merchant dm
    ON fc.merchant_id = dm.merchant_id

WHERE fc.disputed_amount IS NOT NULL

ORDER BY fc.disputed_amount DESC;


-- =========================================================
-- 20. DISPUTE REPORTING DELAY
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_dispute_reporting_delay AS
SELECT
    fc.complaint_id,

    fc.txn_id,

    fc.user_id,

    fc.merchant_id,

    fc.transaction_timestamp,

    fc.reported_timestamp,

    ROUND(
        EXTRACT(
            EPOCH FROM (
                fc.reported_timestamp
                - fc.transaction_timestamp
            )
        ) / 3600.0,
        2
    ) AS reporting_delay_hours,

    fc.disputed_amount,

    fc.reason_code,

    fc.severity

FROM datathon.fact_chargebacks fc

WHERE
    fc.transaction_timestamp IS NOT NULL

    AND fc.reported_timestamp IS NOT NULL

    AND fc.reported_timestamp >= fc.transaction_timestamp;


-- =========================================================
-- 21. AVERAGE DISPUTE REPORTING DELAY
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_average_dispute_reporting_delay AS
SELECT
    ROUND(
        AVG(
            EXTRACT(
                EPOCH FROM (
                    reported_timestamp
                    - transaction_timestamp
                )
            ) / 3600.0
        ),
        2
    ) AS average_reporting_delay_hours,

    COUNT(*) AS valid_dispute_timestamps,

    COUNT(*) FILTER (
        WHERE reported_timestamp
              - transaction_timestamp
              > INTERVAL '72 hours'
    ) AS disputes_reported_after_72_hours

FROM datathon.fact_chargebacks

WHERE
    transaction_timestamp IS NOT NULL

    AND reported_timestamp IS NOT NULL

    AND reported_timestamp >= transaction_timestamp;


-- =========================================================
-- 22. LONG-DELAY DISPUTES
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_long_delay_disputes AS
SELECT
    fc.complaint_id,

    fc.txn_id,

    fc.user_id,

    fc.merchant_id,

    fc.disputed_amount,

    fc.reason_code,

    fc.severity,

    fc.transaction_timestamp,

    fc.reported_timestamp,

    ROUND(
        EXTRACT(
            EPOCH FROM (
                fc.reported_timestamp
                - fc.transaction_timestamp
            )
        ) / 3600.0,
        2
    ) AS reporting_delay_hours

FROM datathon.fact_chargebacks fc

WHERE
    fc.transaction_timestamp IS NOT NULL

    AND fc.reported_timestamp IS NOT NULL

    AND fc.reported_timestamp > fc.transaction_timestamp

    AND fc.reported_timestamp
        - fc.transaction_timestamp
        > INTERVAL '72 hours'

ORDER BY reporting_delay_hours DESC;


-- =========================================================
-- 23. UTR QUALITY METRICS
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_utr_quality_metrics AS
SELECT
    COUNT(*) AS total_transactions,

    COUNT(*) FILTER (
        WHERE utr IS NULL
    ) AS missing_utr_count,

    COUNT(*) FILTER (
        WHERE utr IS NOT NULL
        AND utr !~ '^UTR[0-9]{10}$'
    ) AS invalid_utr_count,

    COUNT(*) FILTER (
        WHERE utr ~ '^UTR[0-9]{10}$'
    ) AS valid_utr_count,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE utr IS NULL
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS missing_utr_rate,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE utr IS NOT NULL
            AND utr !~ '^UTR[0-9]{10}$'
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS invalid_utr_rate

FROM datathon.fact_transactions;


-- =========================================================
-- 24. UTR ISSUES
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_utr_issues AS
SELECT
    txn_id,

    timestamp,

    user_id,

    merchant_id,

    amount,

    utr,

    status,

    CASE
        WHEN utr IS NULL
            THEN 'Missing UTR'

        WHEN utr !~ '^UTR[0-9]{10}$'
            THEN 'Invalid UTR'

        ELSE 'Valid UTR'
    END AS utr_status

FROM datathon.fact_transactions

WHERE
    utr IS NULL

    OR utr !~ '^UTR[0-9]{10}$';


-- =========================================================
-- 25. MERCHANT TRANSACTION SPIKE CANDIDATES
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_merchant_spike_candidates AS
WITH daily AS (
    SELECT
        merchant_id,

        DATE(timestamp) AS transaction_date,

        COUNT(*) AS daily_transactions,

        COALESCE(
            SUM(amount),
            0
        ) AS daily_amount

    FROM datathon.fact_transactions

    WHERE timestamp IS NOT NULL

    GROUP BY
        merchant_id,
        DATE(timestamp)
),

rolling AS (
    SELECT
        merchant_id,

        transaction_date,

        daily_transactions,

        daily_amount,

        AVG(daily_transactions) OVER (
            PARTITION BY merchant_id
            ORDER BY transaction_date
            ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) AS previous_7_day_avg_transactions,

        AVG(daily_amount) OVER (
            PARTITION BY merchant_id
            ORDER BY transaction_date
            ROWS BETWEEN 7 PRECEDING AND 1 PRECEDING
        ) AS previous_7_day_avg_amount

    FROM daily
)

SELECT
    r.merchant_id,

    dm.merchant_name,

    dm.merchant_category,

    r.transaction_date,

    r.daily_transactions,

    r.daily_amount,

    ROUND(
        r.previous_7_day_avg_transactions,
        2
    ) AS previous_7_day_avg_transactions,

    ROUND(
        r.previous_7_day_avg_amount,
        2
    ) AS previous_7_day_avg_amount,

    ROUND(
        r.daily_transactions
        / NULLIF(
            r.previous_7_day_avg_transactions,
            0
        ),
        2
    ) AS transaction_spike_factor,

    ROUND(
        r.daily_amount
        / NULLIF(
            r.previous_7_day_avg_amount,
            0
        ),
        2
    ) AS amount_spike_factor

FROM rolling r

LEFT JOIN datathon.dim_merchant dm
    ON r.merchant_id = dm.merchant_id

WHERE
    r.previous_7_day_avg_transactions IS NOT NULL

    AND r.previous_7_day_avg_transactions > 0

    AND (
        r.daily_transactions
        >= 2 * r.previous_7_day_avg_transactions

        OR

        r.daily_amount
        >= 2 * r.previous_7_day_avg_amount
    )

ORDER BY
    transaction_spike_factor DESC,
    amount_spike_factor DESC;


-- =========================================================
-- 26. DATA QUALITY SUMMARY
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_data_quality_summary AS

SELECT
    'Transactions' AS dataset,

    COUNT(*) AS total_rows,

    COUNT(*) FILTER (
        WHERE txn_id IS NULL
    ) AS missing_primary_key,

    COUNT(*) FILTER (
        WHERE user_id IS NULL
    ) AS missing_user_id,

    COUNT(*) FILTER (
        WHERE merchant_id IS NULL
    ) AS missing_merchant_id,

    COUNT(*) FILTER (
        WHERE amount IS NULL
    ) AS missing_amount,

    COUNT(*) FILTER (
        WHERE utr IS NULL
    ) AS missing_utr

FROM datathon.fact_transactions

UNION ALL

SELECT
    'Customers',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE user_id IS NULL
    ),

    NULL,

    NULL,

    NULL,

    NULL

FROM datathon.dim_customer

UNION ALL

SELECT
    'Merchants',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE merchant_id IS NULL
    ),

    NULL,

    NULL,

    NULL,

    NULL

FROM datathon.dim_merchant

UNION ALL

SELECT
    'Chargebacks',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE complaint_id IS NULL
    ),

    COUNT(*) FILTER (
        WHERE user_id IS NULL
    ),

    COUNT(*) FILTER (
        WHERE merchant_id IS NULL
    ),

    COUNT(*) FILTER (
        WHERE disputed_amount IS NULL
    ),

    NULL

FROM datathon.fact_chargebacks;


-- =========================================================
-- 27. REFERENTIAL INTEGRITY METRICS
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_referential_integrity_metrics AS
SELECT
    'Transaction → Customer' AS relationship,

    COUNT(*) AS total_records,

    COUNT(*) FILTER (
        WHERE dc.user_id IS NOT NULL
    ) AS matched_records,

    COUNT(*) FILTER (
        WHERE dc.user_id IS NULL
    ) AS unmatched_records,

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE dc.user_id IS NOT NULL
        ) / NULLIF(COUNT(*), 0),
        2
    ) AS match_rate

FROM datathon.fact_transactions ft

LEFT JOIN datathon.dim_customer dc
    ON ft.user_id = dc.user_id

UNION ALL

SELECT
    'Transaction → Merchant',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE dm.merchant_id IS NOT NULL
    ),

    COUNT(*) FILTER (
        WHERE dm.merchant_id IS NULL
    ),

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE dm.merchant_id IS NOT NULL
        ) / NULLIF(COUNT(*), 0),
        2
    )

FROM datathon.fact_transactions ft

LEFT JOIN datathon.dim_merchant dm
    ON ft.merchant_id = dm.merchant_id

UNION ALL

SELECT
    'Chargeback → Customer',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE dc.user_id IS NOT NULL
    ),

    COUNT(*) FILTER (
        WHERE dc.user_id IS NULL
    ),

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE dc.user_id IS NOT NULL
        ) / NULLIF(COUNT(*), 0),
        2
    )

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.dim_customer dc
    ON fc.user_id = dc.user_id

UNION ALL

SELECT
    'Chargeback → Merchant',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE dm.merchant_id IS NOT NULL
    ),

    COUNT(*) FILTER (
        WHERE dm.merchant_id IS NULL
    ),

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE dm.merchant_id IS NOT NULL
        ) / NULLIF(COUNT(*), 0),
        2
    )

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.dim_merchant dm
    ON fc.merchant_id = dm.merchant_id

UNION ALL

SELECT
    'Chargeback → Transaction',

    COUNT(*),

    COUNT(*) FILTER (
        WHERE ft.txn_id IS NOT NULL
    ),

    COUNT(*) FILTER (
        WHERE ft.txn_id IS NULL
    ),

    ROUND(
        100.0 * COUNT(*) FILTER (
            WHERE ft.txn_id IS NOT NULL
        ) / NULLIF(COUNT(*), 0),
        2
    )

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.fact_transactions ft
    ON fc.txn_id = ft.txn_id;


-- =========================================================
-- 28. CHARGEBACK TRANSACTION CONSISTENCY
-- =========================================================

CREATE OR REPLACE VIEW datathon.vw_chargeback_transaction_consistency AS
SELECT
    fc.complaint_id,

    fc.txn_id,

    fc.user_id AS chargeback_user_id,

    ft.user_id AS transaction_user_id,

    fc.merchant_id AS chargeback_merchant_id,

    ft.merchant_id AS transaction_merchant_id,

    CASE
        WHEN ft.txn_id IS NULL
            THEN 'Transaction Not Found'

        WHEN fc.user_id = ft.user_id
            THEN 'User Match'

        ELSE 'User Mismatch'
    END AS user_consistency,

    CASE
        WHEN ft.txn_id IS NULL
            THEN 'Transaction Not Found'

        WHEN fc.merchant_id = ft.merchant_id
            THEN 'Merchant Match'

        ELSE 'Merchant Mismatch'
    END AS merchant_consistency

FROM datathon.fact_chargebacks fc

LEFT JOIN datathon.fact_transactions ft
    ON fc.txn_id = ft.txn_id;