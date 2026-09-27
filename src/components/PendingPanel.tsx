import { useState } from "react";
import { DAILY_LIMIT_LITERS } from "../fuel/config";
import { dayKeyOf, formatDateTime } from "../fuel/format";
import { activeLitersOfDay, round2 } from "../fuel/quota";
import { useFuelStore } from "../fuel/store";
import type { FuelOrder } from "../fuel/types";
import PinModal from "./PinModal";

interface Props {
  notify: (ok: boolean, message: string) => void;
}

export default function PendingPanel({ notify }: Props) {
  const orders = useFuelStore((state) => state.orders);
  const approve = useFuelStore((state) => state.approve);
  const revoke = useFuelStore((state) => state.revoke);
  const [pinOrderId, setPinOrderId] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const pendingOrders = orders
    .filter((order) => order.status === "pending")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  function passPin(operator: string) {
    if (!pinOrderId) return;
    const result = approve(pinOrderId, operator);
    notify(result.ok, result.message);
    setPinOrderId(null);
  }

  function confirmRevoke(order: FuelOrder) {
    const result = revoke(order.id, revokeReason);
    notify(result.ok, result.message);
    setRevokeId(null);
    setRevokeReason("");
  }

  return (
    <section className={`panel pending-panel ${pendingOrders.length ? "has-pending" : ""}`}>
      <div className="toolbar">
        <h2>待核验区（{pendingOrders.length}）</h2>
        <span className="panel-hint">同一证件当日累计 ≥ {DAILY_LIMIT_LITERS} 升，站长确认后才放行</span>
      </div>

      {pendingOrders.length === 0 ? (
        <div className="empty">暂无待核验单</div>
      ) : (
        <div className="pending-grid">
          {pendingOrders.map((order) => {
            const total = round2(
              activeLitersOfDay(orders, order.idNumber, dayKeyOf(order.createdAt))
            );
            return (
              <article className="record pending" key={order.id}>
                <div className="record-head">
                  <p className="record-title">{order.name} <span className="muted">{order.idNumber}</span></p>
                  <span className="status status-pending">待核验</span>
                </div>
                <div className="details">
                  <span>容器：{order.containerType}</span>
                  <span>车牌：{order.plate || "无车"}</span>
                  <span>本单：{order.liters} L</span>
                  <span>当日累计：<strong>{total} L</strong></span>
                  <span>登记：{formatDateTime(order.createdAt)}</span>
                  <span>加油员：{order.clerk || "未署名"}</span>
                </div>
                <div className="actions">
                  <button type="button" className="primary" onClick={() => setPinOrderId(order.id)}>
                    站长确认放行
                  </button>
                  {revokeId === order.id ? (
                    <span className="inline-revoke">
                      <input
                        value={revokeReason}
                        placeholder="撤销原因（未出油，额度即还）"
                        onChange={(event) => setRevokeReason(event.target.value)}
                      />
                      <button type="button" className="danger" onClick={() => confirmRevoke(order)}>确认撤销</button>
                      <button type="button" className="secondary" onClick={() => { setRevokeId(null); setRevokeReason(""); }}>
                        取消
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="danger" onClick={() => setRevokeId(order.id)}>
                      撤销未出油
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pinOrderId && <PinModal onClose={() => setPinOrderId(null)} onPass={passPin} />}
    </section>
  );
}
