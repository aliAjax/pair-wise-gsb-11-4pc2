import type { ContainerType } from "./types";

// 同一证件当天累计达到该升数即进入待核验区，需站长确认
export const DAILY_LIMIT_LITERS = 20;

// 站长核验口令（本机演示用，正式环境应由权限服务下发）
export const STATION_MASTER_PIN = "888888";

export const CONTAINER_TYPES: ContainerType[] = ["铁桶", "塑料桶", "油壶", "自备容器"];

export const STORAGE_KEYS = {
  orders: "dfwlfront-10-fuel-orders-v1",
  customers: "dfwlfront-10-fuel-customers-v1",
  clerk: "dfwlfront-10-fuel-clerk-v1"
} as const;
