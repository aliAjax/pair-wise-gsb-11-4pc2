import { DAILY_LIMIT_LITERS } from "./config";
import { dayKeyOf, minuteKeyOf } from "./format";
import type { AmendableField, FuelOrder, OrderStatus } from "./types";

// 限额判定：额度只统计“未撤销”的有效单；已出油单被冻结但仍占额度

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isActiveOrder(order: FuelOrder): boolean {
  return order.status !== "revoked";
}

// 补录后的字段生效值：取最后一条该字段补录，没有则用原值
export function effectiveValue(order: FuelOrder, field: AmendableField): string | number {
  for (let i = order.amendments.length - 1; i >= 0; i -= 1) {
    const amendment = order.amendments[i];
    if (amendment.field === field) return amendment.to;
  }
  return order[field] as string | number;
}

export const effectiveLiters = (order: FuelOrder): number => Number(effectiveValue(order, "liters")) || 0;

// 某证件在某日的已占额度
export function activeLitersOfDay(orders: FuelOrder[], idNumber: string, isoDay: string): number {
  return round2(
    orders
      .filter(
        (order) =>
          isActiveOrder(order) &&
          order.idNumber === idNumber &&
          dayKeyOf(order.createdAt) === isoDay
      )
      .reduce((sum, order) => sum + effectiveLiters(order), 0)
  );
}

// 提交时的初始状态：加上本单累计达到限额则先留待核验区，否则可直接出油
export function initialStatusFor(litersAlready: number, liters: number): OrderStatus {
  return round2(litersAlready + liters) >= DAILY_LIMIT_LITERS ? "pending" : "ready";
}

// 同一证件、同一分钟只保留一单
export function findDuplicateSameMinute(orders: FuelOrder[], idNumber: string, iso: string): FuelOrder | undefined {
  const minute = minuteKeyOf(iso);
  return orders.find(
    (order) =>
      isActiveOrder(order) &&
      order.idNumber === idNumber &&
      minuteKeyOf(order.createdAt) === minute
  );
}

// 撤销或补录升数后，重新判定当天所有待核验单：累计回落到限额以下的自动放回待出油
export function reclassifyPending(
  orders: FuelOrder[],
  operator?: string
): FuelOrder[] {
  const touched = new Set<string>();
  const sorted = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const next = sorted.map((order) => {
    if (order.status !== "pending") return order;
    const day = dayKeyOf(order.createdAt);
    const before = round2(
      sorted
        .filter(
          (other) =>
            other.id !== order.id &&
            isActiveOrder(other) &&
            other.idNumber === order.idNumber &&
            dayKeyOf(other.createdAt) === day &&
            new Date(other.createdAt).getTime() <= new Date(order.createdAt).getTime()
        )
        .reduce((sum, other) => sum + effectiveLiters(other), 0)
    );
    if (round2(before + effectiveLiters(order)) < DAILY_LIMIT_LITERS) {
      touched.add(order.id);
      return {
        ...order,
        status: "ready" as OrderStatus,
        history: [
          ...order.history,
          {
            at: new Date().toISOString(),
            action: "额度回落",
            detail: `撤销/补录后当日累计低于${DAILY_LIMIT_LITERS}升，自动回到待出油`,
            operator
          }
        ]
      };
    }
    return order;
  });
  return orders.map((order) => next.find((candidate) => candidate.id === order.id) ?? order);
}
