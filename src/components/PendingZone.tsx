// 待核验区：同一证件当天累计达到 20L 的单据先留在这里，站长确认后才能出油
import { useState } from "react";
import { App as AntApp, Badge, Button, Empty, Input, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { FuelRecord } from "../types";
import { STATUS_LABEL } from "../types";
import { usePurchaseStore } from "../lib/store";
import { DAILY_LIMIT_LITERS, dailyTotal } from "../lib/quota";
import { maskId } from "./format";

export default function PendingZone() {
  const { message } = AntApp.useApp();
  const records = usePurchaseStore((state) => state.records);
  const verify = usePurchaseStore((state) => state.verify);
  const revoke = usePurchaseStore((state) => state.revoke);
  const [stationMaster, setStationMaster] = useState("");

  const pending = records.filter((record) => record.status === "pending");

  function handleRevoke(record: FuelRecord) {
    const reason = window.prompt(`撤销 ${record.name} 的 ${record.liters}L 登记后额度立即归还，请填写撤销原因：`);
    if (reason === null) return;
    if (!reason.trim()) {
      message.warning("请填写撤销原因");
      return;
    }
    revoke(record.id, reason);
    message.success("已撤销，额度已归还");
  }

  function handleVerify(record: FuelRecord) {
    if (!stationMaster.trim()) {
      message.warning("请先填写站长姓名");
      return;
    }
    verify(record.id, stationMaster);
    message.success("站长已确认，可出油");
  }

  const columns: ColumnsType<FuelRecord> = [
    {
      title: "顾客",
      dataIndex: "name",
      render: (_, record) => (
        <div>
          <strong>{record.name}</strong>
          <div className="sub">{maskId(record.idNumber)}</div>
        </div>
      )
    },
    { title: "容器", dataIndex: "container" },
    {
      title: "车牌",
      dataIndex: "plate",
      render: (plate: string) => plate || <span className="sub">无</span>
    },
    {
      title: "本单 / 今日累计",
      key: "total",
      render: (_, record) => {
        const day = record.createdAt.slice(0, 10);
        const total = dailyTotal(records, record.idNumber, day);
        return (
          <span>
            {record.liters}L / <strong className={total >= DAILY_LIMIT_LITERS ? "quota-hit" : ""}>{total}L</strong>
          </span>
        );
      }
    },
    {
      title: "登记时间",
      dataIndex: "createdAt",
      render: (iso: string) => new Date(iso).toLocaleString("zh-CN", { hour12: false })
    },
    {
      title: "操作",
      key: "actions",
      render: (_, record) => (
        <div className="row-actions">
          <Button size="small" type="primary" onClick={() => handleVerify(record)}>
            站长确认出油
          </Button>
          <Button size="small" danger onClick={() => handleRevoke(record)}>
            撤销
          </Button>
        </div>
      )
    }
  ];

  return (
    <section className="panel pending-zone">
      <div className="toolbar">
        <h2>
          <Badge count={pending.length} showZero color="#d48806" />
          <span className="toolbar-title">待核验区（当日累计 ≥ {DAILY_LIMIT_LITERS}L）</span>
        </h2>
        <Input
          className="master-input"
          placeholder="站长姓名"
          value={stationMaster}
          onChange={(event) => setStationMaster(event.target.value)}
          maxLength={10}
        />
      </div>
      {pending.length === 0 ? (
        <Empty description="暂无待核验单据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table<FuelRecord>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={pending}
          pagination={false}
        />
      )}
      <p className="hint">
        {STATUS_LABEL.pending}：站长核对身份证与容器、确认无误后点击「站长确认出油」；未出油撤销后当日额度立即归还。
      </p>
    </section>
  );
}
