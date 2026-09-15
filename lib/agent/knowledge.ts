type Chunk = { id: string; text: string; terms: string[] };

const CHUNKS: Chunk[] = [
  {
    id: "schema",
    terms: ["schema", "table", "column", "sql"],
    text: `Read-only datathon schema. Always qualify tables with datathon.
fact_transactions(txn_id, user_id, merchant_id, timestamp, amount, utr, status)
fact_chargebacks(txn_id, user_id, merchant_id, transaction_timestamp, reported_timestamp, disputed_amount, reason_code, severity)
dim_merchant(merchant_id, merchant_name, merchant_category, state, city, business_type, merchant_status)
dim_customer(user_id, full_name, kyc_status, occupation)
merchant_risk_scores(merchant_id, merchant_name, merchant_category, state, city, business_type, transaction_count, transaction_amount, chargeback_count, disputed_amount, risk_score, risk_level)
customer_risk_scores(user_id, full_name, dispute_count, disputed_amount, kyc_status, risk_score, transaction_amount)
fraud_clusters(cluster_id, user_count, merchant_count, transaction_count, transaction_amount, failed_transaction_count, failed_rate, chargeback_count, disputed_amount, chargeback_rate, risk_score, risk_level)
fraud_cluster_members(cluster_id, node_type, entity_id)
fraud_network_edges(user_id, merchant_id, risk_level)
Exclude fraud_clusters.cluster_id = 2. Single SELECT only.`,
  },
  {
    id: "risk",
    terms: ["risk", "risky", "highest", "biggest", "leaderboard", "critical", "score"],
    text: `Biggest / highest risk questions:
- Merchants: merchant_risk_scores ORDER BY risk_score DESC
- Users: customer_risk_scores ORDER BY risk_score DESC
- Clusters: fraud_clusters WHERE cluster_id <> 2 ORDER BY risk_score DESC
If the user did not name an entity, compare top merchants by risk_score (bar chart). Never answer a risk question with daily transaction volume.`,
  },
  {
    id: "unusual",
    terms: ["unusual", "repeated", "outlier", "stand out", "low volume", "relatively"],
    text: `Unusual users: customer_risk_scores with dispute_count >= 2 ordered by dispute_count / transaction_amount.
This is NOT daily transaction volume. Chart users on leak ratio.
Q: Which users have repeated chargebacks but relatively low transaction volume? -> unusual_low_volume_users`,
  },
  {
    id: "chargebacks",
    terms: ["chargeback", "dispute", "disputed", "severity", "reason"],
    text: `Chargebacks live in fact_chargebacks and merchant_risk_scores.chargeback_count / disputed_amount. Ratio = chargeback_count / transaction_count. Severity and reason_code are on fact_chargebacks.`,
  },
  {
    id: "clusters",
    terms: ["cluster", "ring", "collus", "network", "merchant-user"],
    text: `Fraud rings: fraud_clusters. Highest-risk cluster vs overall uses risk_score, failed_rate, chargeback_rate. Members in fraud_cluster_members.`,
  },
  {
    id: "geo",
    terms: ["state", "city", "region", "map"],
    text: `Geography: dim_merchant and merchant_risk_scores have state and city. Use grouped bars (not a geo map library). Failed-by-city must count Failed status on fact_transactions, not GMV.`,
  },
  {
    id: "failures",
    terms: ["fail", "failed", "success", "pending", "status"],
    text: `fact_transactions.status is Success, Failed, or Pending. Success vs failed over time uses daily counts. "Which merchant has the most failed transactions" is a merchant ranking, not a volume line.`,
  },
  {
    id: "examples",
    terms: ["which", "show", "compare", "top", "biggest"],
    text: `Few-shot:
Q: which one is the biggest risk / biggest risk / riskiest -> risk_leaderboard (merchants by risk_score). Never daily volume.
Q: which merchant-user cluster is highest risk -> highest_risk_cluster
Q: which user is highest risk -> customer_risk_scores ORDER BY risk_score
Q: which category is highest risk -> AVG/MAX risk_score by merchant_category
Q: which users have repeated chargebacks but low transaction volume -> unusual_low_volume_users (NOT daily volume)
Q: does the merchant with the most chargebacks also have the highest chargeback rate -> chargeback_count_vs_rate
Q: show daily transaction volume -> daily counts by date
Q: which merchant has the highest chargeback count -> top merchants by chargeback_count
Q: which city has the most failed transactions -> Failed counts by city
Q: chargebacks by state -> SUM(chargeback_count) by state
Q: why did fraud rate increase on 20 Dec 2026 -> refuse, dataset only runs 1 Jan 2026 to 3 Dec 2026
Q: why did chargebacks rise in November 2026 -> daily_chargeback_trend
Q: delete the database / drop table / wipe data -> refuse, read-only
Q: what is the weather / tell me a joke -> ask for a UPI analysis question`,
  },
];

function score(question: string, chunk: Chunk) {
  const q = question.toLowerCase();
  return chunk.terms.reduce((sum, term) => sum + (q.includes(term) ? 2 : 0), chunk.id === "schema" ? 1 : 0);
}

export function retrieveKnowledge(question: string, limit = 6) {
  const ranked = [...CHUNKS].sort((a, b) => score(question, b) - score(question, a));
  const schema = CHUNKS.find((chunk) => chunk.id === "schema")?.text ?? "";
  const rest = ranked
    .filter((chunk) => chunk.id !== "schema")
    .slice(0, limit)
    .map((chunk) => chunk.text);
  return [schema, ...rest].join("\n\n");
}
