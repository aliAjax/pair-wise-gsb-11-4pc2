// 顾客资料：证件号规范化、校验与顾客表维护，与限额/存储解耦
import type { Customer } from "../types";

// 证件号统一大写、去空格，作为当日累计和查重的唯一键
export function normalizeIdNumber(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

// 简易 18 位居民身份证号校验（位数 + 出生日期 + 校验位）
export function validateIdNumber(raw: string): string | null {
  const value = normalizeIdNumber(raw);
  if (!/^\d{17}[\dX]$/.test(value)) return "请输入 18 位身份证号";
  const year = Number(value.slice(6, 10));
  const month = Number(value.slice(10, 12));
  const day = Number(value.slice(12, 14));
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "证件号中的出生日期无效";
  }
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = "10X98765432";
  let sum = 0;
  for (let i = 0; i < 17; i += 1) sum += Number(value[i]) * weights[i];
  if (checks[sum % 11] !== value[17]) return "证件号校验位不正确";
  return null;
}

// 车牌：普通号牌或新能源号牌，留空也允许（持桶散购无车场景）
export function validatePlate(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) return null;
  if (!/^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领][A-Z][A-HJ-NP-Z0-9]{4,5}[A-HJ-NP-Z0-9挂学警港澳]$/.test(value)) {
    return "车牌格式不正确，如 京A12345 / 粤B12345D";
  }
  return null;
}

// 按证件号登记/更新顾客资料（姓名以最近一次登记为准）
export function upsertCustomer(customers: Customer[], idNumber: string, name: string): Customer[] {
  const normalized = normalizeIdNumber(idNumber);
  const now = new Date().toISOString();
  const existing = customers.find((item) => item.idNumber === normalized);
  if (existing) {
    return customers.map((item) =>
      item.idNumber === normalized ? { ...item, name: name.trim(), updatedAt: now } : item
    );
  }
  return [{ idNumber: normalized, name: name.trim(), updatedAt: now }, ...customers];
}

export function findCustomer(customers: Customer[], idNumber: string): Customer | undefined {
  return customers.find((item) => item.idNumber === normalizeIdNumber(idNumber));
}
