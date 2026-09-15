import { matchToolByKeywords, type ToolName } from "@/lib/agent/tools";

export type AgentPlan =
  | { kind: "tool"; tool: ToolName; args: Record<string, unknown>; reason: string }
  | { kind: "sql"; sql: string; reason: string; title?: string; weak?: boolean }
  | { kind: "out_of_scope"; reason: string };

const DATA_TERMS =
  /transaction|txn|merchant|chargeback|dispute|kyc|fraud|volume|amount|sales|gmv|user|customer|categor|ratio|utr|cluster|risk|severity|upi|fail|success|atv|ticket|city|state|region|occupation|status|reason|payment|dashboard|q[1-4]|quarter|trend|scatter|correlation|pending|analyse|analyze|insight|graph|chart|compare|highest|lowest|top|peak|delay|occupat|business type|leaderboard|map|which one|biggest/i;

function dateClause(question: string, column: string) {
  const q = question.toLowerCase();
  if (/\bq1\b/.test(q)) return ` AND ${column} >= '2026-01-01' AND ${column} < '2026-04-01'`;
  if (/\bq2\b/.test(q)) return ` AND ${column} >= '2026-04-01' AND ${column} < '2026-07-01'`;
  if (/\bq3\b/.test(q)) return ` AND ${column} >= '2026-07-01' AND ${column} < '2026-10-01'`;
  if (/\bq4\b/.test(q)) return ` AND ${column} >= '2026-10-01' AND ${column} < '2027-01-01'`;
  return "";
}

function hasPeriod(question: string) {
  return /\bq[1-4]\b|quarter|last \d+ days|monthly|weekly/i.test(question);
}

function buildSql(question: string): { sql: string; title: string } | null {
  const q = question.toLowerCase();
  const txnDate = dateClause(question, "timestamp");
  const cbDate = dateClause(question, "transaction_timestamp");
  const limit = /\btop\s+(\d+)/i.exec(question)?.[1] || "12";

  if (/(user|customer)/.test(q) && /(chargeback|dispute)/.test(q) && /(unusual|repeated|relatively|low (transaction )?volume)/.test(q)) {
    return {
      title: "Users with repeated chargebacks vs low volume",
      sql: `SELECT COALESCE(full_name, user_id) AS user_name,
                   COALESCE(dispute_count,0) AS chargebacks,
                   COALESCE(transaction_amount,0) AS txn_amount,
                   COALESCE(disputed_amount,0) AS disputed_amount,
                   ROUND((COALESCE(disputed_amount,0)::numeric / NULLIF(transaction_amount,0)) * 100, 2) AS leak_pct
            FROM datathon.customer_risk_scores
            WHERE COALESCE(dispute_count,0) >= 2
              AND COALESCE(transaction_amount,0) > 0
            ORDER BY (COALESCE(dispute_count,0)::numeric / NULLIF(transaction_amount,0)) DESC
            LIMIT ${limit}`,
    };
  }

  if (/scatter|correlation|vs chargeback/.test(q)) {
    return {
      title: "Merchant amount vs chargebacks",
      sql: `SELECT COALESCE(merchant_name, merchant_id) AS merchant,
                   COALESCE(transaction_amount,0) AS amount,
                   COALESCE(chargeback_count,0) AS chargebacks
            FROM datathon.merchant_risk_scores
            WHERE COALESCE(transaction_count,0) > 0
            ORDER BY transaction_amount DESC NULLS LAST
            LIMIT 80`,
    };
  }

  if (/cluster|fraud ring|collus|merchant-user/.test(q)) {
    return {
      title: "Fraud clusters by risk",
      sql: `SELECT cluster_id::text AS cluster,
                   user_count,
                   merchant_count,
                   transaction_count,
                   chargeback_count,
                   risk_score
            FROM datathon.fraud_clusters
            WHERE cluster_id <> 2
            ORDER BY risk_score DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (/hour|hourly|time of day/.test(q)) {
    const failed = /fail/.test(q);
    return {
      title: failed ? "Failed transactions by hour" : "Transactions by hour of day",
      sql: failed
        ? `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour,
                  COUNT(*) FILTER (WHERE status = 'Failed') AS failed,
                  COUNT(*) AS transactions
           FROM datathon.fact_transactions
           WHERE timestamp IS NOT NULL ${txnDate}
           GROUP BY 1 ORDER BY 1`
        : `SELECT EXTRACT(HOUR FROM timestamp)::int AS hour,
                  COUNT(*) AS transactions,
                  COALESCE(SUM(amount),0) AS amount
           FROM datathon.fact_transactions
           WHERE timestamp IS NOT NULL ${txnDate}
           GROUP BY 1 ORDER BY 1`,
    };
  }

  if (/fail/.test(q) && /city/.test(q)) {
    return {
      title: "Failed transactions by city",
      sql: `SELECT COALESCE(NULLIF(m.city, ''), 'Unmatched') AS city,
                   COUNT(*) FILTER (WHERE t.status = 'Failed') AS failed,
                   COUNT(*) AS transactions
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY CASE WHEN COALESCE(NULLIF(m.city, ''), 'Unmatched') = 'Unmatched' THEN 1 ELSE 0 END,
                     COUNT(*) FILTER (WHERE t.status = 'Failed') DESC
            LIMIT ${limit}`,
    };
  }

  if (/fail/.test(q) && /categor/.test(q)) {
    return {
      title: "Failed transactions by category",
      sql: `SELECT COALESCE(m.merchant_category, 'Unmatched') AS category,
                   COUNT(*) FILTER (WHERE t.status = 'Failed') AS failed,
                   COUNT(*) AS transactions
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY COUNT(*) FILTER (WHERE t.status = 'Failed') DESC
            LIMIT ${limit}`,
    };
  }

  if (/fail/.test(q) && /(state|region)/.test(q)) {
    return {
      title: "Failed transactions by state",
      sql: `SELECT COALESCE(m.state, 'Unmatched') AS state,
                   COUNT(*) FILTER (WHERE t.status = 'Failed') AS failed,
                   COUNT(*) AS transactions
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY COUNT(*) FILTER (WHERE t.status = 'Failed') DESC
            LIMIT ${limit}`,
    };
  }

  if (/fail/.test(q) && /merchant/.test(q)) {
    return {
      title: "Merchants with the most failed transactions",
      sql: `SELECT COALESCE(m.merchant_name, t.merchant_id) AS merchant,
                   COUNT(*) FILTER (WHERE t.status = 'Failed') AS failed,
                   COUNT(*) AS transactions
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY COUNT(*) FILTER (WHERE t.status = 'Failed') DESC
            LIMIT ${limit}`,
    };
  }

  if (/\b(user|customer)\b/.test(q) && /risk/.test(q)) {
    return {
      title: "Highest-risk users",
      sql: `SELECT COALESCE(full_name, user_id) AS user_name,
                   COALESCE(risk_score,0) AS risk_score,
                   COALESCE(dispute_count,0) AS disputes,
                   COALESCE(disputed_amount,0) AS disputed_amount
            FROM datathon.customer_risk_scores
            ORDER BY risk_score DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (/categor/.test(q) && /risk/.test(q)) {
    return {
      title: "Risk by merchant category",
      sql: `SELECT COALESCE(merchant_category, 'Unknown') AS category,
                   ROUND(AVG(risk_score)::numeric, 1) AS avg_risk,
                   COUNT(*) AS merchants,
                   COALESCE(SUM(chargeback_count),0) AS chargebacks
            FROM datathon.merchant_risk_scores
            GROUP BY 1
            ORDER BY AVG(risk_score) DESC NULLS LAST`,
    };
  }

  if (/(state|region)/.test(q) && /risk/.test(q)) {
    return {
      title: "Risk by state",
      sql: `SELECT COALESCE(state, 'Unmatched') AS state,
                   ROUND(AVG(risk_score)::numeric, 1) AS avg_risk,
                   COUNT(*) AS merchants,
                   COALESCE(SUM(chargeback_count),0) AS chargebacks
            FROM datathon.merchant_risk_scores
            GROUP BY 1
            ORDER BY AVG(risk_score) DESC NULLS LAST`,
    };
  }

  if (/occupation/.test(q)) {
    return {
      title: "Transactions by customer occupation",
      sql: `SELECT COALESCE(c.occupation, 'Unknown') AS occupation,
                   COUNT(*) AS transactions,
                   COALESCE(SUM(t.amount),0) AS amount
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_customer c ON c.user_id = t.user_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY SUM(t.amount) DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (/monthly|by month/.test(q)) {
    const metric = /chargeback|dispute/.test(q)
      ? {
          title: "Monthly chargebacks",
          sql: `SELECT to_char(date_trunc('month', transaction_timestamp), 'YYYY-MM') AS month,
                COUNT(*) AS chargebacks,
                COALESCE(SUM(disputed_amount),0) AS disputed_amount
         FROM datathon.fact_chargebacks
         WHERE transaction_timestamp IS NOT NULL ${cbDate}
         GROUP BY 1 ORDER BY 1`,
        }
      : {
          title: "Monthly transaction volume",
          sql: `SELECT to_char(date_trunc('month', timestamp), 'YYYY-MM') AS month,
                COUNT(*) AS volume,
                COALESCE(SUM(amount),0) AS amount
         FROM datathon.fact_transactions
         WHERE timestamp IS NOT NULL ${txnDate}
         GROUP BY 1 ORDER BY 1`,
        };
    return metric;
  }

  if (/(status|successful|failed|pending)/.test(q) && /by status|transaction status|compare/.test(q) && !/vs failed/.test(q)) {
    return {
      title: "Transactions by status",
      sql: `SELECT COALESCE(status, 'Unknown') AS status,
                   COUNT(*) AS transactions,
                   COALESCE(SUM(amount),0) AS amount
            FROM datathon.fact_transactions
            WHERE timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY COUNT(*) DESC`,
    };
  }

  if (/risk level/.test(q)) {
    return {
      title: "Merchants by risk level",
      sql: `SELECT COALESCE(risk_level, 'Unknown') AS risk_level,
                   COUNT(*) AS merchants,
                   COALESCE(SUM(chargeback_count),0) AS chargebacks,
                   COALESCE(SUM(disputed_amount),0) AS disputed_amount
            FROM datathon.merchant_risk_scores
            GROUP BY 1
            ORDER BY SUM(disputed_amount) DESC NULLS LAST`,
    };
  }

  if (/by city|which city/.test(q)) {
    return {
      title: "Transaction amount by city",
      sql: `SELECT COALESCE(city, 'Unmatched') AS city,
                   COALESCE(SUM(transaction_amount),0) AS amount,
                   COALESCE(SUM(transaction_count),0) AS transactions
            FROM datathon.merchant_risk_scores
            GROUP BY 1
            ORDER BY SUM(transaction_amount) DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (/business type/.test(q)) {
    return {
      title: "Amount by business type",
      sql: `SELECT COALESCE(business_type, 'Unknown') AS business_type,
                   COALESCE(SUM(transaction_amount),0) AS amount,
                   COALESCE(SUM(chargeback_count),0) AS chargebacks
            FROM datathon.merchant_risk_scores
            GROUP BY 1
            ORDER BY SUM(transaction_amount) DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (/high-?risk merchant|merchants by risk|biggest risk|highest risk|riskiest/.test(q)) {
    return {
      title: "Highest-risk merchants",
      sql: `SELECT COALESCE(merchant_name, merchant_id) AS merchant,
                   COALESCE(merchant_category, 'Unknown') AS category,
                   COALESCE(risk_score,0) AS risk_score,
                   COALESCE(chargeback_count,0) AS chargebacks
            FROM datathon.merchant_risk_scores
            ORDER BY risk_score DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (txnDate && (/state|region/.test(q))) {
    return {
      title: "Transaction amount by state",
      sql: `SELECT COALESCE(m.state, 'Unmatched') AS state,
                   COUNT(*) AS transactions,
                   COALESCE(SUM(t.amount),0) AS amount
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY SUM(t.amount) DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (txnDate && (/categor/.test(q))) {
    return {
      title: "Transaction amount by category",
      sql: `SELECT COALESCE(m.merchant_category, 'Unmatched') AS category,
                   COUNT(*) AS transactions,
                   COALESCE(SUM(t.amount),0) AS amount
            FROM datathon.fact_transactions t
            LEFT JOIN datathon.dim_merchant m ON m.merchant_id = t.merchant_id
            WHERE t.timestamp IS NOT NULL ${txnDate}
            GROUP BY 1
            ORDER BY SUM(t.amount) DESC NULLS LAST
            LIMIT ${limit}`,
    };
  }

  if (txnDate && (/volume|trend|amount|sales/.test(q))) {
    return {
      title: "Daily transaction volume",
      sql: `SELECT to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS date,
                   COUNT(*) AS volume,
                   COALESCE(SUM(amount),0) AS amount
            FROM datathon.fact_transactions
            WHERE timestamp IS NOT NULL ${txnDate}
            GROUP BY 1 ORDER BY 1`,
    };
  }

  return null;
}

export function planQuestion(question: string): AgentPlan {
  const q = question.trim();
  if (!DATA_TERMS.test(q)) {
    return {
      kind: "out_of_scope",
      reason: "The question is outside UPI transaction, merchant, chargeback, KYC, and fraud analytics.",
    };
  }

  if (!hasPeriod(q)) {
    const tool = matchToolByKeywords(q);
    if (tool) {
      return { kind: "tool", tool, args: { limit: 10 }, reason: `Matched analytics tool ${tool}.` };
    }
  }

  const compiled = buildSql(q);
  if (compiled) {
    return { kind: "sql", sql: compiled.sql, title: compiled.title, reason: "Compiled a read-only SELECT from the question slots." };
  }

  const tool = matchToolByKeywords(q);
  if (tool) {
    return { kind: "tool", tool, args: { limit: 10 }, reason: `Matched analytics tool ${tool}.` };
  }

  return {
    kind: "out_of_scope",
    reason: "The question is outside UPI transaction, merchant, chargeback, KYC, and fraud analytics.",
  };
}

