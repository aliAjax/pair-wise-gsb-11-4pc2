import type { CustomerProfile } from "./types";

// 顾客资料：证件规范、规范化、资料册维护

export function normalizeIdNumber(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidIdNumber(value: string): boolean {
  const id = normalizeIdNumber(value);
  if (!/^\d{17}[\dX]$/.test(id)) return false;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checks = "10X98765432";
  let sum = 0;
  for (let i = 0; i < 17; i += 1) sum += Number(id[i]) * weights[i];
  return checks[sum % 11] === id[17];
}

export function normalizePlate(value: string): string {
  return value.trim().toUpperCase();
}

export function isLikelyPlate(value: string): boolean {
  const plate = normalizePlate(value);
  // 车牌选填；填写时按常见民用车牌/新能源车牌宽松校验
  return /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼][A-Z][A-Z0-9]{5,6}$/.test(plate);
}

export function findCustomer(customers: CustomerProfile[], idNumber: string): CustomerProfile | undefined {
  const id = normalizeIdNumber(idNumber);
  return customers.find((customer) => customer.idNumber === id);
}

// 每次成功登记后更新资料册：新顾客建档，老顾客累加到访
export function touchCustomer(
  customers: CustomerProfile[],
  draft: { idNumber: string; name: string; containerType: string; plate: string },
  nowIso: string
): CustomerProfile[] {
  const idNumber = normalizeIdNumber(draft.idNumber);
  const existing = findCustomer(customers, idNumber);
  if (existing) {
    return customers.map((customer) =>
      customer.idNumber === idNumber
        ? {
            ...customer,
            name: draft.name.trim() || customer.name,
            lastContainer: draft.containerType,
            lastPlate: draft.plate,
            visits: customer.visits + 1,
            lastAt: nowIso
          }
        : customer
    );
  }
  const profile: CustomerProfile = {
    idNumber,
    name: draft.name.trim(),
    lastContainer: draft.containerType,
    lastPlate: draft.plate,
    visits: 1,
    firstAt: nowIso,
    lastAt: nowIso
  };
  return [profile, ...customers];
}
