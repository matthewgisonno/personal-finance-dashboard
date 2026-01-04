export type AccountOption = {
  id: string;
  name: string;
  type: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
};

export type ReportFilters = {
  account?: string;
  startDate?: Date;
  endDate?: Date;
};
