import { useCallback, useMemo, useState } from "react";
import RegisterForm from "./components/RegisterForm";
import PendingPanel from "./components/PendingPanel";
import RecordDesk from "./components/RecordDesk";
import { DAILY_LIMIT_LITERS } from "./fuel/config";
import { dayKeyOf } from "./fuel/format";
import { effectiveLiters, isActiveOrder } from "./fuel/quota";
import { useFuelStore } from "./fuel/store";

interface Toast {
  ok: boolean;
  message: string;
  nonce: number;
}

const STACK = ["React", "Vite", "TypeScript", "Zustand", "localStorage"];

export default function App() {
  const orders = useFuelStore((state) => state.orders);
  const clerk = useFuelStore((state) => state.clerk);
  const setClerk = useFuelStore((state) => state.setClerk);
  const resetAll = useFuelStore((state) => state.resetAll);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((ok: boolean, message: string) => {
    setToast({ ok, message, nonce: Date.now() });
  }, []);

  const today = dayKeyOf(new Date().toISOString());
  const metrics = useMemo(() => {
    const todayOrders = orders.filter((order) => dayKeyOf(order.createdAt) === today && isActiveOrder(order));
    const dispensed = todayOrders.filter((order) => order.status === "dispensed");
    return [
      { label: "今日登记单数", value: todayOrders.length },
      { label: `今日待核验（累计≥${DAILY_LIMIT_LITERS}L）`, value: orders.filter((o) => o.status === "pending").length },
      { label: "今日已出油（升）", value: dispensed.reduce((sum, order) => sum + effectiveLiters(order), 0) }
    ];
  }, [orders, today]);

  return (
    <main className="app">
      <div className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">散装汽油销售 · 实名登记台</p>
            <h1>实名购油登记与核验</h1>
            <p className="subtitle">
              凭证件登记姓名、证件号、容器、车牌与升数；当日同一证件累计满 {DAILY_LIMIT_LITERS} 升先入待核验区，站长确认后出油。撤销即还额度，已出油烟冻结、补录留痕。
            </p>
          </div>
          <div className="topbar-side">
            <div className="stack">{STACK.map((item) => <span className="tag" key={item}>{item}</span>)}</div>
            <label className="clerk-box">
              当班加油员
              <input value={clerk} placeholder="填写姓名，随单保存" onChange={(event) => setClerk(event.target.value)} />
            </label>
          </div>
        </header>

        <section className="metrics">
          {metrics.map((metric) => (
            <article className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{Math.round(metric.value * 100) / 100}</strong>
            </article>
          ))}
        </section>

        <PendingPanel notify={notify} />

        <section className="workspace">
          <RegisterForm notify={notify} />
          <RecordDesk notify={notify} />
        </section>

        <footer className="footer">
          <span>数据仅保存在本机浏览器（订单与顾客资料分键），重开页面后可按证件号和日期回查。</span>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (window.confirm("确定清空本机登记数据并恢复演示数据？")) {
                resetAll();
                notify(true, "已恢复演示数据");
              }
            }}
          >
            恢复演示数据
          </button>
        </footer>
      </div>

      {toast && (
        <div key={toast.nonce} className={`toast ${toast.ok ? "ok" : "warn"}`} onAnimationEnd={() => setToast(null)}>
          {toast.message}
        </div>
      )}
    </main>
  );
}
