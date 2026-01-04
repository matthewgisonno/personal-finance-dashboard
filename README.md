# Personal Finance Dashboard

A modern, AI-powered personal finance tracker built with Next.js 15, Drizzle ORM, and the Vercel AI SDK. This application allows users to upload transaction history, automatically categorizes expenses using a hybrid local/AI approach, and provides actionable financial insights.

## Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL (via [Neon](https://neon.tech/))
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **AI:** [Vercel AI SDK](https://sdk.vercel.ai/docs) (OpenAI GPT-4o)
- **Styling:** Tailwind CSS + Radix UI (shadcn/ui patterns)
- **Charts:** Recharts

## Key Features

### 1. Smart Transaction Ingestion

- **CSV Upload:** Parse and ingest bulk transaction data via `papaparse`.
- **Hybrid Categorization Engine:**
  - **Layer 1 (Local):** Instant, deterministic keyword matching for common merchants (e.g., Starbucks -> Food & Drink).
  - **Layer 2 (AI):** Uncategorized transactions are processed by GPT-4o to intelligently assign categories based on context.

### 2. AI Financial Insights

- **Monthly Analysis:** Generates a "CLEAR" framework report on your spending habits.
- **Actionable Tips:** Provides specific recommendations to save money based on your highest spending categories.
- **Budget Alerts:** Automatically flags categories that are consuming a disproportionate share of your budget.

### 3. Interactive Dashboard

- **Visual Reports:** Monthly expense trends and category breakdowns.
- **Transaction Management:** Edit categories, search transactions, and view confidence scores for AI predictions.

## Architecture & Data Flow

### Database Schema

- **Users & Accounts:** Core identity and banking relationship.
- **Transactions:** Stores individual line items with status flags (`pending`, `completed`) and source indicators (`local`, `ai`).
- **Categories:** Standardized bucket for expenses (e.g., Housing, Food, Utilities).
- **AI Insights:** Stores historical generated reports to avoid re-fetching expensive AI tokens.

### Core Workflows

#### Transaction Upload & Categorization

1. **User uploads CSV** to the `/upload` page.
2. **Client parses CSV** and sends data to `/api/ingest`.
3. **Ingest API:**
   - Runs `attemptLocalCategorization` (regex/keyword match).
   - Inserts transactions into Postgres.
   - If a local match is found, status is `completed`.
   - If not, status is `pending`.
4. **Client triggers AI** (`/api/categorize-ai`) for `pending` items.
5. **AI API:**
   - Sends minimized transaction data (ID + Description) to OpenAI.
   - Updates the database with predicted categories and confidence scores.

#### Insight Generation

1. **Dashboard loads** and checks for fresh insights.
2. **Insight API** (`/api/insights`) aggregates last 30 days of spending.
3. **OpenAI Analysis:** Prompts the model to act as a financial advisor using the aggregated data.
4. **Result:** JSON object containing summary, recommendations, and alerts is stored in DB and returned to UI.

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL Database (local or Neon)
- OpenAI API Key

### 1. Environment Setup

Create a `.env` file in the root directory:

```bash
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_URL="https://some-url.com"
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Push the schema to your database and seed initial data (default user/account/categories).

```bash
npm run db:push
npm run db:seed
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

- `npm run generate-csv`: Generates a mock CSV file with realistic transaction data for testing uploads.
- `npm run db:studio`: Opens Drizzle Studio to inspect your database visually.
- `npm run lint`: Runs ESLint.

## Project Structure

```
src/
├── app/                  # Next.js App Router pages & API routes
│   ├── (dashboard)/      # Protected dashboard routes
│   └── api/              # Backend endpoints (ingest, ai, etc.)
├── components/           # React components (UI, feature-specific)
├── lib/
│   ├── db/               # Drizzle schema & connection
│   ├── services/         # Business logic (categorization)
│   └── actions/          # Server actions for data fetching
└── scripts/              # Utility scripts (CSV generation)
```
