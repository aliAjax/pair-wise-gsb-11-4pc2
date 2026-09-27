import { useMemo, useState } from "react";
import { DAILY_LIMIT_LITERS } from "../fuel/config";
import { formatDateTime, formatTime, todayKey } from "../fuel/format";
import { activeLitersOfDay, effectiveLiters, effectiveValue } from "../fuel/quota";
import { useFuelStore } from "../fuel/store";
import {
  FIELD_LABEL,
  STATUS_LABEL,
  type AmendableField,
  type FuelOrder,
  type OrderStatus
} from "../fuel/types";
import AmendModal from "./AmendModal";

interface Props {
  notify: (ok: boolean, message: string) => void;
}

const STATUS_FILTERS: Array<"all" | OrderStatus> = ["all", "ready", "pending", "dispensed", "revoked"];

const AMEND_DOTS: Record<AmendableField, string> = {
  name: "姓名",
  containerType: "容器",
  plate: "车牌",
  liters: "升数"
};

export default function RecordDesk({ notify }: Props) {
  const orders = useFuelStore((state) => state.orders);
  const dispense = useFuelStore((state) => state.dispense);
  const revoke = useFuelStore((state) => state.revoke);
  const amend = useFuelStore((state) => state.amend);

  const [idQuery, setIdQuery] = useState("");
  const [dateQuery, setDateQuery] = useState(todayKey());
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [amending, setAmending] = useState<FuelOrder | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const id = idQuery.trim().toUpperCase();
    return orders
      .filter((order) => (dateQuery ? order.createdAt.slice(0, 10) === dateQuery : true))
      .filter((order) => (id ? order.idNumber.includes(id) : true))
      .filter((order) => (statusFilter === "all" ? true : order.status === statusFilter))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, idQuery, dateQuery, statusFilter]);

  const summary = useMemo(() => {
    if (!idQuery.trim() || !dateQuery) return null;
    const matched = orders
      .filter((order) => order.idNumber.includes(idQuery.trim().toUpperCase()))
      .filter((order) => order.createdAt.slice(0, 10) === dateQuery);
    const name = matched.find((order) => order.status !== "revoked")?.name ?? matched[0]?.name ?? "—";
    return {
      name,
      active: activeLitersOfDay(orders, matched[0]?.idNumber ?? "", dateQuery),
      dispensed: round(matched.filter((order) => order.status === "dispensed").reduce((s, o) => s + effectiveLiters(o), 0)),
      count: matched.filter((order) => order.status !== "revoked").length
    };
  }, [orders, idQuery, dateQuery]);

  function round(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  function doAmend(change: { field: AmendableField; to: string; reason: string }) {
    if (!amending) return;
    const result = amend(amending.id, change);
    notify(result.ok, result.message);
    setAmending(null);
  }

  return (
    <section className="list-panel">
      <div className="toolbar">
        <h2>登记记录回查</h2>
        <div className="query-row">
          <input
            value={idQuery}
            placeholder="按身份证号查（支持部分号码）"
            onChange={(event) => setIdQuery(event.target.value)}
          />
          <input type="date" value={dateQuery} onChange={(event) => setDateQuery(event.target.value)} />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | OrderStatus)}>
            {STATUS_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === "all" ? "全部状态" : STATUS_LABEL[value as OrderStatus]}
              </option>
            ))}
          </select>
          {(idQuery.trim() || dateQuery !== todayKey()) && (
            <button type="button" className="secondary" onClick={() => { setIdQuery(""); setDateQuery(todayKey()); setStatusFilter("all"); }}>
              重置
            </button>
          )}
        </div>
      </div>

      {summary && summary.name !== "—" && (
        <div className={`summary-box ${summary.active >= DAILY_LIMIT_LITERS ? "over" : ""}`}>
          <span>顾客：{summary.name}</span>
          <span>当日有效单数：{summary.count}</span>
          <span>已出油：{summary.dispensed} L</span>
          <span>当日占用额度：<strong>{summary.active} / {DAILY_LIMIT_LITERS} L</strong></span>
        </div>
      )}

      <div className="record-grid">
        {filtered.length === 0 ? (
          <div className="empty">该证件/日期下没有记录</div>
        ) : (
          filtered.map((order) => (
            <article className={`record status-row-${order.status}`} key={order.id}>
              <div className="record-head">
                <p className="record-title">
                  {order.name}
                  <span className="muted"> {order.idNumber}</span>
                  {order.amendments.length > 0 && <span className="amend-flag">含补录</span>}
                  {order.status === "dispensed" && <span className="frozen-flag">已冻结</span>}
                </p>
                <span className={`status status-${order.status}`}>{STATUS_LABEL[order.status]}</span>
              </div>

              <div className="details">
                <span>容器：{String(effectiveValue(order, "containerType"))}</span>
                <span>车牌：{String(effectiveValue(order, "plate")) || "无车"}</span>
                <span>
                  升数：{effectiveLiters(order)} L
                  {order.amendments.some((a) => a.field === "liters") && (
                    <em className="old-value">（原 {order.liters} L）</em>
                  )}
                </span>
                <span>时间：{formatDateTime(order.createdAt)}</span>
                <span>加油员：{order.clerk || "未署名"}</span>
              </div>

              {order.amendments.length > 0 && (
                <div className="amend-list">
                  {order.amendments.map((amendment, index) => (
                    <p className="amend-item" key={index}>
                      <strong>补录{AMEND_DOTS[amendment.field]}</strong>
                      <span>{amendment.from} → {amendment.to}</span>
                      <span>原因：{amendment.reason}</span>
                      <span className="muted">
                        {formatTime(amendment.at)} {amendment.operator ? `· ${amendment.operator}` : ""}
                      </span>
                    </p>
                  ))}
                </div>
              )}

              <div className="actions">
                {order.status === "ready" && (
                  <button type="button" className="primary" onClick={() => {
                    const result = dispense(order.id);
                    notify(result.ok, result.message);
                  }}>
                    确认出油
                  </button>
                )}
                {order.status === "pending" && <span className="wait-hint">等待站长在待核验区确认</span>}
                {(order.status === "ready" || order.status === "pending") && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => {
                      const reason = window.prompt("撤销原因（未出油，额度立即归还）", "");
                      if (reason === null) return;
                      const result = revoke(order.id, reason);
                      notify(result.ok, result.message);
                    }}
                  >
                    撤销
                  </button>
                )}
                {order.status === "dispensed" && (
                  <button type="button" className="secondary" onClick={() => setAmending(order)}>
                    补录更正
                  </button>
                )}
                <button type="button" className="secondary" onClick={() => setHistoryId(historyId === order.id ? null : order.id)}>
                  {historyId === order.id ? "收起流水" : "操作流水"}
                </button>
              </div>

              {historyId === order.id && (
                <ol className="history">
                  {order.history.map((entry, index) => (
                    <li key={index}>
                      <span className="muted">{formatDateTime(entry.at)}</span>
                      <strong>{entry.action}</strong>
                      {entry.operator && <span>{entry.operator}</span>}
                      {entry.detail && <span className="history-detail">{entry.detail}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </article>
          ))
        )}
      </div>

      {amending && (
        <AmendModal
          order={orders.find((item) => item.id === amending.id) ?? amending}
          onClose={() => setAmending(null)}
          onSubmit={doAmend}
        />
      )}
    </section>
  );
}
