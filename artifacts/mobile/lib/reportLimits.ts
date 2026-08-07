import { safeGet, safeSet } from "./safeStorage";

const KEY = "hwb_local_report_limits_v1";

type LimitData = {
  date: string;
  totalCount: number;
  domainCounts: Record<string, number>;
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function getLimitData(): Promise<LimitData> {
  const today = todayStr();
  const data = await safeGet<LimitData>(KEY, {
    date: today,
    totalCount: 0,
    domainCounts: {},
  });

  if (data.date !== today) {
    return { date: today, totalCount: 0, domainCounts: {} };
  }

  return data;
}

export async function canReport(domain: string): Promise<{ allowed: boolean; reason?: string }> {
  const data = await getLimitData();

  if (data.totalCount >= 25) {
    return { allowed: false, reason: "Daily limit reached (25 reports per day). Try again tomorrow." };
  }

  const domainCount = data.domainCounts[domain] ?? 0;
  if (domainCount >= 3) {
    return { allowed: false, reason: `You've already reported ${domain} 3 times today.` };
  }

  return { allowed: true };
}

export async function recordReport(domain: string): Promise<void> {
  const data = await getLimitData();
  data.totalCount += 1;
  data.domainCounts[domain] = (data.domainCounts[domain] ?? 0) + 1;
  await safeSet(KEY, data);
}
