// 散装汽油实名登记：领域模型

export type OrderStatus = "pending" | "ready" | "dispensed" | "revoked";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "待核验",
  ready: "待出油",
  dispensed: "已出油",
  revoked: "已撤销"
};

export type ContainerType = "铁桶" | "塑料桶" | "油壶" | "自备容器";

export type AmendableField = "name" | "containerType" | "plate" | "liters";

export const FIELD_LABEL: Record<AmendableField, string> = {
  name: "姓名",
  containerType: "容器类型",
  plate: "车牌",
  liters: "本次升数"
};

export interface HistoryEntry {
  at: string;
  action: string;
  detail?: string;
  operator?: string;
}

export interface Amendment {
  at: string;
  field: AmendableField;
  from: string;
  to: string;
  reason: string;
  operator?: string;
}

export interface FuelOrder {
  id: string;
  idNumber: string;
  name: string;
  containerType: ContainerType | string;
  plate: string;
  liters: number;
  status: OrderStatus;
  createdAt: string;
  clerk?: string;
  history: HistoryEntry[];
  amendments: Amendment[];
}

export interface CustomerProfile {
  idNumber: string;
  name: string;
  lastContainer?: string;
  lastPlate?: string;
  visits: number;
  firstAt: string;
  lastAt: string;
}
