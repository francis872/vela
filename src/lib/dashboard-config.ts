import { prisma } from "@/lib/prisma";
import {
  DashboardThresholds,
  flattenThresholds,
  mapRecordToThresholds,
  normalizeThresholds,
} from "@/lib/dashboard-thresholds";

const DEFAULT_KEY = "default";

export async function getDashboardThresholds(): Promise<DashboardThresholds> {
  const config = await prisma.dashboardThresholdConfig.upsert({
    where: { key: DEFAULT_KEY },
    update: {},
    create: { key: DEFAULT_KEY },
  });

  return mapRecordToThresholds(config);
}

export async function updateDashboardThresholds(
  thresholds: DashboardThresholds,
): Promise<DashboardThresholds> {
  const normalized = normalizeThresholds(thresholds);
  const flat = flattenThresholds(normalized);

  const config = await prisma.dashboardThresholdConfig.upsert({
    where: { key: DEFAULT_KEY },
    update: flat,
    create: { key: DEFAULT_KEY, ...flat },
  });

  return mapRecordToThresholds(config);
}