export const SENDER_MIN_COVERAGE_DAYS = 30;
export const RECEIVER_TARGET_COVERAGE_DAYS = 20;

export function toDailyDemand(
  forecastDemandForPeriod: number,
  periodDays: number,
): number {
  const safeDemand = Number.isFinite(forecastDemandForPeriod)
    ? Math.max(0, forecastDemandForPeriod)
    : 0;
  const safePeriod = Number.isFinite(periodDays) ? Math.max(1, periodDays) : 30;
  return safeDemand / safePeriod;
}

export function maxSafeTransferForSender(
  senderStock: number,
  senderForecastDemandForPeriod: number,
  periodDays: number,
  minCoverageDays: number = SENDER_MIN_COVERAGE_DAYS,
): number {
  const safeStock = Number.isFinite(senderStock) ? Math.max(0, senderStock) : 0;
  const dailyDemand = toDailyDemand(senderForecastDemandForPeriod, periodDays);
  if (!Number.isFinite(dailyDemand) || dailyDemand <= 0) {
    return 0;
  }

  const minUnitsToKeep = Math.ceil(dailyDemand * Math.max(1, minCoverageDays));
  return Math.max(0, safeStock - minUnitsToKeep);
}
