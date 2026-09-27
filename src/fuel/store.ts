import { create } from "zustand";
import {
  activeLitersOfDay,
  findDuplicateSameMinute,
  initialStatusFor,
  reclassifyPending,
  round2
} from "./quota";
import { dayKeyOf } from "./format";
import { normalizeIdNumber, touchCustomer } from "./customers";
import {
  clearLocalData,
  loadClerk,
  loadCustomers,
  loadOrders,
  saveClerk,
  saveCustomers,
  saveOrders
} from "./storage";
import { FIELD_LABEL, type AmendableField, type CustomerProfile, type FuelOrder } from "./types";

export interface SubmitDraft {
  idNumber: string;
  name: string;
  containerType: string;
  plate: string;
  liters: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  order?: FuelOrder;
}

interface FuelState {
  orders: FuelOrder[];
  customers: CustomerProfile[];
  clerk: string;

  setClerk: (clerk: string) => void;
  submit: (draft: SubmitDraft) => ActionResult;
  approve: (orderId: string, operator: string) => ActionResult;
  dispense: (orderId: string) => ActionResult;
  revoke: (orderId: string, reason: string) => ActionResult;
  amend: (orderId: string, change: { field: AmendableField; to: string; reason: string }) => ActionResult;
  resetAll: () => void;
}

const initialOrders = loadOrders();

export const useFuelStore = create<FuelState>((set, get) => {
  function commit(orders: FuelOrder[], customers?: CustomerProfile[]) {
    saveOrders(orders);
    if (customers) saveCustomers(customers);
    set({ orders, ...(customers ? { customers } : {}) });
  }

  function withOrder(orderId: string, label: string): { order?: FuelOrder; result?: ActionResult } {
    const order = get().orders.find((item) => item.id === orderId);
    if (!order) return { result: { ok: false, message: "未找到该登记记录" } };
    return { order };
  }

  return {
    orders: initialOrders,
    customers: loadCustomers(initialOrders),
    clerk: loadClerk(),

    setClerk: (clerk) => {
      saveClerk(clerk);
      set({ clerk });
    },

    submit: (draft) => {
      const now = new Date().toISOString();
      const idNumber = normalizeIdNumber(draft.idNumber);
      const duplicate = findDuplicateSameMinute(get().orders, idNumber, now);
      if (duplicate) {
        return {
          ok: false,
          message: `该证件在本分钟已有一单（${duplicate.name} ${duplicate.liters}升），同一分钟只保留一单`,
          order: duplicate
        };
      }
      const day = dayKeyOf(now);
      const already = activeLitersOfDay(get().orders, idNumber, day);
      const liters = round2(draft.liters);
      const status = initialStatusFor(already, liters);
      const clerk = get().clerk;
      const order: FuelOrder = {
        id: crypto.randomUUID(),
        idNumber,
        name: draft.name.trim(),
        containerType: draft.containerType,
        plate: draft.plate,
        liters,
        status,
        createdAt: now,
        clerk: clerk || undefined,
        history: [
          {
            at: now,
            action: "登记",
            detail:
              status === "pending"
                ? `当日累计${round2(already + liters)}升达到限额，进入待核验`
                : `当日累计${round2(already + liters)}升，等待出油`,
            operator: clerk || undefined
          }
        ],
        amendments: []
      };
      const customers = touchCustomer(get().customers, { ...draft, idNumber }, now);
      commit([order, ...get().orders], customers);
      return {
        ok: true,
        message:
          status === "pending"
            ? `已登记${liters}升：当日累计达到限额，已进入待核验区，等待站长确认`
            : `已登记${liters}升：待出油`,
        order
      };
    },

    approve: (orderId, operator) => {
      const { order, result } = withOrder(orderId, "核验");
      if (result || !order) return result ?? { ok: false, message: "未找到该登记记录" };
      if (order.status !== "pending") {
        return { ok: false, message: "只有待核验单需要站长确认" };
      }
      const next: FuelOrder = {
        ...order,
        status: "ready",
        history: [
          ...order.history,
          { at: new Date().toISOString(), action: "站长核验通过", detail: "确认证件与购油用途，放行出油", operator }
        ]
      };
      commit(get().orders.map((item) => (item.id === orderId ? next : item)));
      return { ok: true, message: `已核验通过：${next.name} ${next.liters}升，可出油`, order: next };
    },

    dispense: (orderId) => {
      const { order, result } = withOrder(orderId, "出油");
      if (result || !order) return result ?? { ok: false, message: "未找到该登记记录" };
      if (order.status !== "ready") {
        return { ok: false, message: order.status === "pending" ? "该单还在待核验区，需站长先确认" : "该单已处理" };
      }
      const next: FuelOrder = {
        ...order,
        status: "dispensed",
        history: [...order.history, { at: new Date().toISOString(), action: "确认出油", operator: get().clerk || undefined }]
      };
      commit(get().orders.map((item) => (item.id === orderId ? next : item)));
      return { ok: true, message: `已出油：${next.name} ${next.liters}升，记录已冻结`, order: next };
    },

    revoke: (orderId, reason) => {
      const { order, result } = withOrder(orderId, "撤销");
      if (result || !order) return result ?? { ok: false, message: "未找到该登记记录" };
      if (order.status === "dispensed") {
        return { ok: false, message: "已出油记录冻结，不能撤销；如需更正请走补录" };
      }
      if (order.status === "revoked") {
        return { ok: false, message: "该单已撤销" };
      }
      const clerk = get().clerk;
      const revoked: FuelOrder = {
        ...order,
        status: "revoked",
        history: [
          ...order.history,
          { at: new Date().toISOString(), action: "撤销", detail: reason || "未出油，撤销并归还额度", operator: clerk || undefined }
        ]
      };
      const reclassified = reclassifyPending(
        get().orders.map((item) => (item.id === orderId ? revoked : item)),
        clerk || undefined
      );
      commit(reclassified);
      return { ok: true, message: `已撤销 ${order.liters}升，额度立即归还`, order: revoked };
    },

    amend: (orderId, change) => {
      const { order, result } = withOrder(orderId, "补录");
      if (result || !order) return result ?? { ok: false, message: "未找到该登记记录" };
      if (order.status !== "dispensed") {
        return { ok: false, message: "只有已出油的冻结记录需要补录" };
      }
      if (!change.reason.trim()) {
        return { ok: false, message: "补录必须填写原因" };
      }
      const rawTo = change.field === "liters" ? String(round2(Number(change.to))) : change.to.trim();
      if (change.field === "liters" && !(Number(rawTo) > 0)) {
        return { ok: false, message: "补录升数必须大于0" };
      }
      if (!rawTo) {
        return { ok: false, message: `补录后的${FIELD_LABEL[change.field]}不能为空` };
      }

      const currentValue =
        [...order.amendments].reverse().find((item) => item.field === change.field)?.to ??
        String(order[change.field] ?? "");
      if (currentValue === rawTo) {
        return { ok: false, message: `补录后的${FIELD_LABEL[change.field]}与现值一致` };
      }

      const clerk = get().clerk;
      const amendment = {
        at: new Date().toISOString(),
        field: change.field,
        from: currentValue,
        to: rawTo,
        reason: change.reason.trim(),
        operator: clerk || undefined
      };
      const amended: FuelOrder = {
        ...order,
        amendments: [...order.amendments, amendment],
        history: [
          ...order.history,
          {
            at: amendment.at,
            action: "补录",
            detail: `${FIELD_LABEL[change.field]}：${currentValue} → ${rawTo}，原因：${change.reason.trim()}`,
            operator: clerk || undefined
          }
        ]
      };

      let next = get().orders.map((item) => (item.id === orderId ? amended : item));
      if (change.field === "liters") {
        next = reclassifyPending(next, clerk || undefined);
      }
      commit(next);
      return { ok: true, message: `补录已保存：${FIELD_LABEL[change.field]} ${currentValue} → ${rawTo}，原值保留`, order: amended };
    },

    resetAll: () => {
      clearLocalData();
      const orders = loadOrders();
      const customers = loadCustomers(orders);
      const clerk = "";
      set({ orders, customers, clerk });
    }
  };
});
