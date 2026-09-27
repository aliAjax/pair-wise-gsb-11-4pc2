import type { CustomerProfile, FuelOrder } from "./types";

// 首次打开（本机无存档）时的演示数据，证件号均为带合法校验位的虚构号码

function isoAt(hour: number, minute: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function buildSeedOrders(): FuelOrder[] {
  return [
    {
      id: "seed-1",
      idNumber: "110101199003071233",
      name: "陈建国",
      containerType: "铁桶",
      plate: "京A12345",
      liters: 10,
      status: "dispensed",
      createdAt: isoAt(9, 5),
      clerk: "何鑫",
      history: [
        { at: isoAt(9, 5), action: "登记", operator: "何鑫" },
        { at: isoAt(9, 8), action: "确认出油", detail: "当班直接出油", operator: "何鑫" }
      ],
      amendments: []
    },
    {
      id: "seed-2",
      idNumber: "110101199003071233",
      name: "陈建国",
      containerType: "铁桶",
      plate: "京A12345",
      liters: 10,
      status: "pending",
      createdAt: isoAt(10, 20),
      clerk: "何鑫",
      history: [
        { at: isoAt(10, 20), action: "登记", detail: `当日累计达到20升，进入待核验`, operator: "何鑫" }
      ],
      amendments: []
    },
    {
      id: "seed-3",
      idNumber: "310115198811250628",
      name: "李晓梅",
      containerType: "塑料桶",
      plate: "沪B88021",
      liters: 8,
      status: "ready",
      createdAt: isoAt(10, 40),
      clerk: "何鑫",
      history: [{ at: isoAt(10, 40), action: "登记", operator: "何鑫" }],
      amendments: []
    },
    {
      id: "seed-4",
      idNumber: "440304200107298848",
      name: "王强",
      containerType: "自备容器",
      plate: "",
      liters: 5,
      status: "dispensed",
      createdAt: isoAt(8, 30),
      clerk: "何鑫",
      history: [
        { at: isoAt(8, 30), action: "登记", operator: "何鑫" },
        { at: isoAt(8, 33), action: "确认出油", operator: "何鑫" },
        {
          at: isoAt(8, 50),
          action: "补录",
          detail: "本次升数：5 → 6，原因：实际加注6升，小票核对",
          operator: "何鑫"
        }
      ],
      amendments: [
        { at: isoAt(8, 50), field: "liters", from: "5", to: "6", reason: "实际加注6升，小票核对", operator: "何鑫" }
      ]
    },
    {
      id: "seed-5",
      idNumber: "120103197502183315",
      name: "张伟",
      containerType: "油壶",
      plate: "津C55677",
      liters: 15,
      status: "dispensed",
      createdAt: isoAt(16, 10, -1),
      clerk: "何鑫",
      history: [
        { at: isoAt(16, 10, -1), action: "登记", operator: "何鑫" },
        { at: isoAt(16, 15, -1), action: "确认出油", operator: "何鑫" }
      ],
      amendments: []
    }
  ];
}

export function buildSeedCustomers(orders: FuelOrder[]): CustomerProfile[] {
  const profiles = new Map<string, CustomerProfile>();
  orders
    .filter((order) => order.status !== "revoked")
    .forEach((order) => {
      const existing = profiles.get(order.idNumber);
      if (existing) {
        existing.visits += 1;
        existing.lastAt = order.createdAt;
        existing.lastContainer = String(order.containerType);
        existing.lastPlate = order.plate;
        return;
      }
      profiles.set(order.idNumber, {
        idNumber: order.idNumber,
        name: order.name,
        lastContainer: String(order.containerType),
        lastPlate: order.plate,
        visits: 1,
        firstAt: order.createdAt,
        lastAt: order.createdAt
      });
    });
  return [...profiles.values()];
}
