// 限额判定：同一证件「当天」累计升数与 20L 阈值、同分钟去重
// 仅依据记录数据计算，不关心数据来自哪里（内存/localStorage/后端）
import type { FuelRecord, PurchaseStatus } from "../types";
import { normalizeIdNumber } from "./customer";

export const DAILY_LIMIT_LITERS = 20;

// 按本地日期取 YYYY-MM-DD，跨班回查按日期筛选
export function localDateOf(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function minuteKeyOf(iso: string): string {
  return iso.slice(0, 16); // YYYY-MM-DDTHH:mm
}

// 占额度的状态：待核验与可出油都占用（同一张证件的待核验单先把额度占住），
// 已撤销立即归还；已出油是已兑现的购买量，同样计入当天累计。
const COUNTED_STATUSES: ReadonlySet<PurchaseStatus> = new Set(["pending", "approved", "dispensed"]);

// 同一证件、指定日期（默认记录自身所在日期）的累计购油升数
export function dailyTotal(records: FuelRecord[], idNumber: string, date: string): number {
  const normalized = normalizeIdNumber(idNumber);
  return records
    .filter(
      (record) =>
        normalizeIdNumber(record.idNumber) === normalized &&
        localDateOf(record.createdAt) === date &&
        COUNTED_STATUSES.has(record.status)
    )
    .reduce((sum, record) => sum + record.liters, 0);
}

// 判定新登记一单后是否触达限额：累计「达到」20L 即进待核验区
export function reachesLimit(currentTotal: number, incomingLiters: number): boolean {
  return currentTotal + incomingLiters >= DAILY_LIMIT_LITERS;
}

export type DedupResult =
  | { duplicated: false }
  | { duplicated: true; existingId: string };

// 同一证件 + 同一分钟重复提交：只保留一单（找到则拦截新单）
export function findSameMinuteDuplicate(
  records: FuelRecord[],
  idNumber: string,
  createdAt: string
): DedupResult {
  const normalized = normalizeIdNumber(idNumber);
  const minute = minuteKeyOf(createdAt);
  const existing = records.find(
    (record) =>
      normalizeIdNumber(record.idNumber) === normalized &&
      minuteKeyOf(record.createdAt) === minute &&
      record.status !== "revoked"
  );
  return existing ? { duplicated: true, existingId: existing.id } : { duplicated: false };
}
