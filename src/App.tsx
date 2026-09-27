import { App as AntApp } from "antd";
import { useMemo } from "react";
import RegistrationForm from "./components/RegistrationForm";
import PendingZone from "./components/PendingZone";
import RecordList from "./components/RecordList";
import { usePurchaseStore } from "./lib/store";
import { localDateOf } from "./lib/quota";

const STACK = ["React", "Vite", "TypeScript", "Zustand", "Ant Design"];

export default function App() {
  const records = usePurchaseStore((state) => state.records);
  const today = localDateOf(new Date().toISOString());

  const metrics = useMemo(() => {
    const todays = records.filter((record) => localDateOf(record.createdAt) === today);
    const active = todays.filter((record) => record.status !== "revoked");
    const liters = active.reduce((sum, record) => sum + record.liters, 0);
    return [
      { label: "今日登记（单）", value: active.length },
      { label: "今日购油（升）", value: liters },
      { label: "待核验（单）", value: records.filter((record) => record.status === "pending").length },
      { label: "待出油（单）", value: records.filter((record) => record.status === "approved").length }
    ];
  }, [records, today]);

  return (
    <AntApp>
      <main className="app">
        <div className="shell">
          <header className="topbar">
            <div>
              <p className="eyebrow">石油行业 · 散装汽油实名销售</p>
              <h1>实名购油登记台</h1>
              <p className="subtitle">
                出示身份证登记姓名、证件号、容器、车牌与升数；同一证件当天累计满 20L 先进待核验区，站长确认后出油。数据保存在本机，重开可按证件与日期回查。
              </p>
            </div>
            <div className="stack">
              {STACK.map((item) => <span className="tag" key={item}>{item}</span>)}
            </div>
          </header>

          <section className="metrics metrics-4">
            {metrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </article>
            ))}
          </section>

          <section className="workspace workspace-wide">
            <RegistrationForm />
            <div className="main-column">
              <PendingZone />
              <RecordList />
            </div>
          </section>
        </div>
      </main>
    </AntApp>
  );
}
