// 实名购油登记台：领域类型定义
// 登记记录状态：
// pending    待核验（当天累计已达 20L 限额，需站长确认）
// approved   已核准可出油（累计未达限额，登记后可直接出油）
// dispensed  已出油（记录冻结，仅可补录）
// revoked    已撤销（未出油撤销，额度已归还，仅留痕）
export type PurchaseStatus = "pending" | "approved" | "dispensed" | "revoked";

export const STATUS_LABEL: Record<PurchaseStatus, string> = {
  pending: "待核验",
  approved: "可出油",
  dispensed: "已出油",
  revoked: "已撤销"
};

// 散装汽油容器类型（实名登记常用容器）
export const CONTAINER_TYPES = ["铁桶", "塑料桶", "自备油壶", "车辆油箱"] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

// 补录：只追加，不改原值。snapshot 保存补录当次的生效值，方便追溯
export type Amendment = {
  id: string;
  reason: string;
  operator: string;
  createdAt: string;
  previousContainer: string;
  previousPlate: string;
  previousRemark: string;
  container?: string;
  plate?: string;
  remark?: string;
};

export type FuelRecord = {
  id: string;
  name: string;
  idNumber: string;
  container: string;
  plate: string;
  liters: number;
  remark: string;
  status: PurchaseStatus;
  createdAt: string; // ISO 时间
  // 状态流转留痕
  verifiedBy?: string; // 站长确认人
  verifiedAt?: string;
  dispensedAt?: string;
  revokedAt?: string;
  revokedReason?: string;
  amendments: Amendment[];
};

export type Customer = {
  idNumber: string; // 主键：证件号
  name: string;
  updatedAt: string;
};

export type PurchaseInput = {
  name: string;
  idNumber: string;
  container: string;
  plate: string;
  liters: number;
  remark?: string;
};

export type AmendmentInput = {
  reason: string;
  operator: string;
  container?: string;
  plate?: string;
  remark?: string;
};
