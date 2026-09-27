// 首次打开时的示例数据（localStorage 已有数据则不会使用）
import type { Customer, FuelRecord } from "../types";
import { localDateOf } from "./quota";

export function seedRecords(): FuelRecord[] {
  const today = localDateOf(new Date().toISOString());
  const at = (hour: number, minute: number) =>
    new Date(`${today}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).toISOString();

  return [
    {
      id: "seed-1",
      name: "何鑫",
      idNumber: "110101199003074514",
      container: "铁桶",
      plate: "京A12345",
      liters: 10,
      remark: "工地机械用油",
      status: "dispensed",
      createdAt: at(9, 12),
      dispensedAt: at(9, 15),
      amendments: []
    },
    {
      id: "seed-2",
      name: "何鑫",
      idNumber: "110101199003074514",
      container: "自备油壶",
      plate: "京A12345",
      liters: 10,
      remark: "",
      status: "pending",
      createdAt: at(10, 40),
      amendments: []
    },
    {
      id: "seed-3",
      name: "周敏",
      idNumber: "440106198811220827",
      container: "塑料桶",
      plate: "粤B88K21",
      liters: 5,
      remark: "",
      status: "approved",
      createdAt: at(10, 55),
      amendments: []
    }
  ];
}

export function seedCustomers(): Customer[] {
  return [
    { idNumber: "110101199003074514", name: "何鑫", updatedAt: new Date().toISOString() },
    { idNumber: "440106198811220827", name: "周敏", updatedAt: new Date().toISOString() }
  ];
}
