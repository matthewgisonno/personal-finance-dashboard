export type CategorizedTransaction = {
  id: string;
  date: string | Date;
  description: string;
  amount: number | string;
  categoryId: string | null;
  category: string;
  categoryConfidence: string;
  categorySource: string;
  categoryStatus: string;
  accountName?: string;
  accountId?: string;
};
