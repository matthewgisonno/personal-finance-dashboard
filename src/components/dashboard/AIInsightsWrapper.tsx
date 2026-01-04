import { getLatestInsight, getInsightHistory } from '@/lib/actions/getInsights';

import { AIInsightsClient } from './AIInsightsClient';

export async function AIInsightsWrapper() {
  const [latestInsight, history] = await Promise.all([getLatestInsight(), getInsightHistory()]);

  return <AIInsightsClient initialInsight={latestInsight} initialHistory={history} />;
}
