import { STORAGE_KEYS } from "./config";
import { buildSeedCustomers, buildSeedOrders } from "./seed";
import type { CustomerProfile, FuelOrder } from "./types";

// 本机保存层：订单与顾客资料分键存储，JSON 带版本前缀

type StoredEnvelope<T> = { version: 1; data: T };

function readKey<T>(key: string, fallback: () => T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback();
  try {
    const envelope = JSON.parse(raw) as StoredEnvelope<T>;
    return envelope.data;
  } catch {
    return fallback();
  }
}

function writeKey<T>(key: string, data: T): void {
  const envelope: StoredEnvelope<T> = { version: 1, data };
  localStorage.setItem(key, JSON.stringify(envelope));
}

export function loadOrders(): FuelOrder[] {
  return readKey<FuelOrder[]>(STORAGE_KEYS.orders, () => buildSeedOrders());
}

export function saveOrders(orders: FuelOrder[]): void {
  writeKey(STORAGE_KEYS.orders, orders);
}

export function loadCustomers(orders: FuelOrder[]): CustomerProfile[] {
  return readKey<CustomerProfile[]>(STORAGE_KEYS.customers, () => buildSeedCustomers(orders));
}

export function saveCustomers(customers: CustomerProfile[]): void {
  writeKey(STORAGE_KEYS.customers, customers);
}

export function loadClerk(): string {
  return readKey<string>(STORAGE_KEYS.clerk, () => "");
}

export function saveClerk(clerk: string): void {
  writeKey(STORAGE_KEYS.clerk, clerk);
}

export function clearLocalData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}
