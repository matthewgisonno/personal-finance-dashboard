import { relations } from 'drizzle-orm';
import { pgTable, uuid, text, numeric, timestamp, varchar, index, jsonb } from 'drizzle-orm/pg-core';

// USERS TABLE
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  avatar: text('avatar'), // URL to image
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ACCOUNTS TABLE
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // checking, savings, credit
  balance: numeric('balance', { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// CATEGORIES TABLE
export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(), // Unique name for lookups
  type: varchar('type', { length: 20 }).notNull().default('expense'), // income / expense
  color: varchar('color', { length: 7 }), // hex code like #FF0000
  icon: varchar('icon', { length: 50 }), // lucide icon name
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// TRANSACTIONS TABLE
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    accountId: uuid('account_id')
      .references(() => accounts.id)
      .notNull(),

    date: timestamp('date').notNull(),
    description: text('description').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),

    // Categorization Logic
    categoryId: uuid('category_id')
      .references(() => categories.id)
      .notNull(),
    categoryStatus: varchar('category_status', { length: 20 }).default('pending').notNull(), // 'pending', 'completed',

    categorySource: varchar('category_source', { length: 20 }), // 'pending', 'local', 'ai', 'manual'
    categoryConfidence: numeric('category_confidence', { precision: 3, scale: 2 }), // 0.00 to 1.00

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
  },
  table => {
    return {
      // Index for fast background processing
      statusIdx: index('status_idx').on(table.categoryStatus)
    };
  }
);

// AI INSIGHTS TABLE
export const aiInsights = pgTable('ai_insights', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull(),
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  summary: text('summary').notNull(),
  recommendations: jsonb('recommendations').notNull(),
  budgetAlerts: jsonb('budget_alerts').notNull(),
  totalSpend: numeric('total_spend', { precision: 12, scale: 2 })
});

// RELATIONS
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  aiInsights: many(aiInsights)
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id]
  }),
  transactions: many(transactions)
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id]
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id]
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id]
  })
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  user: one(users, {
    fields: [aiInsights.userId],
    references: [users.id]
  })
}));
