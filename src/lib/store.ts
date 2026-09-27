// 本机保存：Zustand + localStorage 持久化
// 只负责记录与顾客资料的存取、状态流转，不含任何页面代码
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AmendmentInput,
  Customer,
  FuelRecord,
  PurchaseInput
} from "../types";
import {
  normalizeIdNumber,
  upsertCustomer,
  validateIdNumber,
  validatePlate
} from "./customer";
import {
  dailyTotal,
  findSameMinuteDuplicate,
  localDateOf,
  reachesLimit
} from "./quota";
import { seedCustomers, seedRecords } from "./seed";

const STORAGE_KEY = "dfwlfront-10-fuel-purchase";

export type AddResult =
  | { ok: true; record: FuelRecord }
  | { ok: false; error: string; existingId?: string };

type PurchaseStore = {
  records: FuelRecord[];
  customers: Customer[];
  addPurchase: (input: PurchaseInput) => AddResult;
  verify: (id: string, stationMaster: string) => void;
  dispense: (id: string) => void;
  revoke: (id: string, reason: string) => void;
  amend: (id: string, input: AmendmentInput) => void;
};

function validateInput(input: PurchaseInput): string | null {
  if (!input.name.trim()) return "请录入顾客姓名";
  const idError = validateIdNumber(input.idNumber);
  if (idError) return idError;
  if (!input.container) return "请选择容器类型";
  const plateError = validatePlate(input.plate);
  if (plateError) return plateError;
  if (!Number.isFinite(input.liters) || input.liters <= 0) return "购油升数必须大于 0";
  if (input.liters > 1000) return "单笔升数异常，请核对";
  return null;
}

function patchRecord(records: FuelRecord[], id: string, patch: Partial<FuelRecord>): FuelRecord[] {
  return records.map((record) => (record.id === id ? { ...record, ...patch } : record));
}

export const usePurchaseStore = create<PurchaseStore>()(
  persist(
    (set, get) => ({
      records: seedRecords(),
      customers: seedCustomers(),

      addPurchase: (input) => {
        const error = validateInput(input);
        if (error) return { ok: false, error };

        const { records, customers } = get();
        const createdAt = new Date().toISOString();
        const idNumber = normalizeIdNumber(input.idNumber);

        // 同一证件、同一分钟只保留一单
        const duplicate = findSameMinuteDuplicate(records, idNumber, createdAt);
        if (duplicate.duplicated) {
          return { ok: false, error: "同一证件同一分钟已登记，仅保留首单", existingId: duplicate.existingId };
        }

        // 当天累计：达到 20L 先进待核验区，站长确认后才能出油
        const today = localDateOf(createdAt);
        const totalBefore = dailyTotal(records, idNumber, today);
        const status = reachesLimit(totalBefore, input.liters) ? "pending" : "approved";

        const record: FuelRecord = {
          id: crypto.randomUUID(),
          name: input.name.trim(),
          idNumber,
          container: input.container,
          plate: input.plate.trim().toUpperCase(),
          liters: Number(input.liters),
          remark: (input.remark ?? "").trim(),
          status,
          createdAt,
          amendments: []
        };

        set({
          records: [record, ...records],
          customers: upsertCustomer(customers, idNumber, record.name)
        });
        return { ok: true, record };
      },

      // 站长确认待核验单
      verify: (id, stationMaster) => {
        const record = get().records.find((item) => item.id === id);
        if (!record || record.status !== "pending" || !stationMaster.trim()) return;
        set({
          records: patchRecord(get().records, id, {
            status: "approved",
            verifiedBy: stationMaster.trim(),
            verifiedAt: new Date().toISOString()
          })
        });
      },

      // 出油：仅已核准单可出油，出油后冻结
      dispense: (id) => {
        const record = get().records.find((item) => item.id === id);
        if (!record || record.status !== "approved") return;
        set({
          records: patchRecord(get().records, id, {
            status: "dispensed",
            dispensedAt: new Date().toISOString()
          })
        });
      },

      // 撤销未出油记录：额度由 dailyTotal 的状态集合自动归还
      revoke: (id, reason) => {
        const record = get().records.find((item) => item.id === id);
        if (!record || (record.status !== "pending" && record.status !== "approved")) return;
        if (!reason.trim()) return;
        set({
          records: patchRecord(get().records, id, {
            status: "revoked",
            revokedAt: new Date().toISOString(),
            revokedReason: reason.trim()
          })
        });
      },

      // 补录：仅已出油（冻结）记录可补录；原值快照保留在 amendment 中
      amend: (id, input) => {
        const record = get().records.find((item) => item.id === id);
        if (!record || record.status !== "dispensed") return;
        if (!input.reason.trim() || !input.operator.trim()) return;
        const nextContainer = input.container?.trim() ?? record.container;
        const nextPlate = (input.plate ?? record.plate).trim().toUpperCase();
        const nextRemark = input.remark ?? record.remark;
        if (
          nextContainer === record.container &&
          nextPlate === record.plate &&
          nextRemark.trim() === record.remark
        ) {
          return;
        }
        const amendment = {
          id: crypto.randomUUID(),
          reason: input.reason.trim(),
          operator: input.operator.trim(),
          createdAt: new Date().toISOString(),
          previousContainer: record.container,
          previousPlate: record.plate,
          previousRemark: record.remark,
          container: nextContainer,
          plate: nextPlate,
          remark: nextRemark
        };
        set({
          records: patchRecord(get().records, id, {
            container: nextContainer,
            plate: nextPlate,
            remark: nextRemark,
            amendments: [...record.amendments, amendment]
          })
        });
      }
    }),
    {
      name: STORAGE_KEY,
      version: 1
    }
  )
);
