export const APP_NAME = "UPI Guard";
export const APP_TAGLINE = "Fraud Analytics Platform";
export const APP_QUOTE = "Smarter Payments.\nSafer Tomorrow.";

export const DEFAULT_DATE_FROM = "2026-01-01";
export const DEFAULT_DATE_TO = "2026-12-03";

export const MERCHANT_CATEGORIES = [
  "All",
  "Apparel & Fashion",
  "Books & Stationery",
  "Department Store",
  "Grocery",
  "Hotel & Lodging",
  "Medical",
  "Miscellaneous",
  "Pharmacy",
  "Restaurants & Food",
  "Retail",
  "Telecom",
  "Transportation",
  "Travel",
] as const;

export const MERCHANT_STATUSES = ["All", "Active", "Inactive", "On Hold", "Suspended"] as const;

export const RISK_SEGMENTS = ["All", "Low", "Medium", "High"] as const;

export const USER_TYPES = ["All", "Personal", "Business"] as const;

export const BUSINESS_TYPES = [
  "All",
  "Sole Proprietor",
  "Partnership",
  "Private Limited",
  "Individual",
] as const;

export const MERCHANT_STATES = [
  "All",
  "Maharashtra",
  "Karnataka",
  "Delhi",
  "Tamil Nadu",
  "Telangana",
  "Punjab",
  "Uttar Pradesh",
  "Rajasthan",
  "West Bengal",
] as const;

export const RISK_LEVELS = ["All", "Low", "Medium", "High", "Critical"] as const;

export const TXN_STATUSES = ["All", "Success", "Failed", "Pending", "Processing"] as const;

export const AMOUNT_RANGES = [
  { label: "All", min: "", max: "" },
  { label: "₹0 – ₹500", min: "0", max: "500" },
  { label: "₹500 – ₹2,000", min: "500", max: "2000" },
  { label: "₹2,000 – ₹10,000", min: "2000", max: "10000" },
  { label: "₹10,000+", min: "10000", max: "" },
] as const;

export const MIN_TXN_OPTIONS = ["All", "5", "10", "25", "50"] as const;

export const NAV_ITEMS = [
  { key: "home", href: "/", label: "Home" },
  { key: "dashboard", href: "/dashboard", label: "Executive Dashboard" },
  { key: "merchants", href: "/merchants", label: "Merchant Analysis" },
  { key: "transactions", href: "/transactions", label: "Transaction Explorer" },
  { key: "fraud-network", href: "/fraud-network", label: "Fraud Network" },
  { key: "ask-ai", href: "/ask-ai", label: "Ask AI" },
  { key: "about", href: "/about", label: "About Project" },
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Beverage": "#3B82F6",
  Travel: "#6366F1",
  Electronics: "#EF4444",
  Entertainment: "#F59E0B",
  Grocery: "#10B981",
  Retail: "#0EA5E9",
  Utilities: "#8B5CF6",
  Healthcare: "#14B8A6",
  "E-commerce": "#F97316",
  Finance: "#DC2626",
  Others: "#94A3B8",
};
