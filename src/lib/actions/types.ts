export type AccountOptionType = {
  id: string;
  name: string;
  type: string;
};

export type CategoryOptionType = {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
};

export type InsightDataType = {
  id: string;
  generatedAt: Date;
  summary: string;
  recommendations: {
    category: string;
    tip: string;
    potentialSavings: number;
  }[];
  budgetAlerts: string[];
  totalSpend: string | null;
};

export type MonthlyExpenseDataType = {
  month: string; // "YYYY-MM"
  category: string;
  amount: number;
};

export type ReportFiltersType = {
  account?: string;
  startDate?: Date;
  endDate?: Date;
};
