// 登记记录：重开页面后按证件号、日期、状态回查；含出油/撤销/补录操作
import { useMemo, useState } from "react";
import {
  App as AntApp,
  Button,
  DatePicker,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import type { FuelRecord, PurchaseStatus } from "../types";
import { STATUS_LABEL } from "../types";
import { usePurchaseStore } from "../lib/store";
import { localDateOf } from "../lib/quota";
import { normalizeIdNumber } from "../lib/customer";
import { formatTime, maskId } from "./format";
import AmendmentModal from "./AmendmentModal";

const STATUS_COLOR: Record<PurchaseStatus, string> = {
  pending: "warning",
  approved: "processing",
  dispensed: "success",
  revoked: "default"
};

const FILTER_STATUSES: Array<{ value: PurchaseStatus | "all"; label: string }> = [
  { value: "all", label: "全部状态" },
  { value: "approved", label: STATUS_LABEL.approved },
  { value: "pending", label: STATUS_LABEL.pending },
  { value: "dispensed", label: STATUS_LABEL.dispensed },
  { value: "revoked", label: STATUS_LABEL.revoked }
];

export default function RecordList() {
  const { message } = AntApp.useApp();
  const records = usePurchaseStore((state) => state.records);
  const dispense = usePurchaseStore((state) => state.dispense);
  const revoke = usePurchaseStore((state) => state.revoke);
  const [idQuery, setIdQuery] = useState("");
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [statusFilter, setStatusFilter] = useState<PurchaseStatus | "all">("all");
  const [amending, setAmending] = useState<FuelRecord | null>(null);

  const filtered = useMemo(() => {
    const id = normalizeIdNumber(idQuery);
    return records.filter((record) => {
      if (id && !record.idNumber.includes(id)) return false;
      if (date && localDateOf(record.createdAt) !== date.format("YYYY-MM-DD")) return false;
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      return true;
    });
  }, [records, idQuery, date, statusFilter]);

  function handleDispense(record: FuelRecord) {
    dispense(record.id);
    message.success(`已为 ${record.name} 出油 ${record.liters}L，记录已冻结`);
  }

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
    { title: "升数", dataIndex: "liters", align: "right", render: (v: number) => `${v}L` },
    {
      title: "状态",
      dataIndex: "status",
      render: (status: PurchaseStatus, record) => (
        <Space size={4} wrap>
          <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>
          {record.verifiedBy && <span className="sub">站长：{record.verifiedBy}</span>}
        </Space>
      )
    },
    {
      title: "登记时间",
      dataIndex: "createdAt",
      render: (iso: string) => formatTime(iso)
    },
    {
      title: "操作",
      key: "actions",
      width: 220,
      render: (_, record) => {
        if (record.status === "approved") {
          return (
            <div className="row-actions">
              <Button size="small" type="primary" onClick={() => handleDispense(record)}>
                出油
              </Button>
              <Button size="small" danger onClick={() => handleRevoke(record)}>
                撤销
              </Button>
            </div>
          );
        }
        if (record.status === "dispensed") {
          return (
            <Button size="small" onClick={() => setAmending(record)}>
              补录
            </Button>
          );
        }
        return <span className="sub">{record.status === "pending" ? "请到待核验区处理" : "—"}</span>;
      }
    }
  ];

  return (
    <section className="panel list-panel">
      <div className="toolbar">
        <h2>购油登记记录</h2>
        <Space wrap>
          <Input.Search
            allowClear
            className="id-search"
            placeholder="按证件号查询"
            maxLength={18}
            onSearch={setIdQuery}
            onChange={(event) => {
              if (!event.target.value) setIdQuery("");
            }}
          />
          <DatePicker
            value={date}
            onChange={setDate}
            allowClear
            placeholder="按日期"
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 120 }}
            options={FILTER_STATUSES}
          />
        </Space>
      </div>

      {filtered.length === 0 ? (
        <Empty description="暂无匹配记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table<FuelRecord>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={filtered}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          expandable={{
            expandedRowRender: (record) => (
              <ExpandedDetail record={record} onAmend={() => setAmending(record)} />
            ),
            rowExpandable: (record) =>
              !!record.remark ||
              !!record.revokedReason ||
              record.amendments.length > 0 ||
              record.status === "dispensed"
          }}
        />
      )}

      <AmendmentModal record={amending} onClose={() => setAmending(null)} />
    </section>
  );
}

function ExpandedDetail({ record, onAmend }: { record: FuelRecord; onAmend: () => void }) {
  return (
    <div className="detail-box">
      <div className="detail-row">
        <span>备注：{record.remark || "无"}</span>
      </div>
      <div className="detail-row">
        {record.verifiedAt && <span>站长确认：{record.verifiedBy} · {formatTime(record.verifiedAt)}</span>}
        {record.dispensedAt && <span>出油时间：{formatTime(record.dispensedAt)}</span>}
        {record.revokedAt && (
          <span className="revoke-text">撤销：{formatTime(record.revokedAt)} · 原因：{record.revokedReason}</span>
        )}
      </div>
      {record.amendments.length > 0 && (
        <div className="amend-list">
          <p className="amend-title">补录痕迹（{record.amendments.length} 次，原值保留）：</p>
          {record.amendments.map((amendment) => (
            <div className="amend-item" key={amendment.id}>
              <p>
                {formatTime(amendment.createdAt)} · {amendment.operator} · 原因：{amendment.reason}
              </p>
              {amendment.previousContainer !== amendment.container && (
                <p>容器：{amendment.previousContainer} → {amendment.container}</p>
              )}
              {amendment.previousPlate !== amendment.plate && (
                <p>车牌：{amendment.previousPlate || "无"} → {amendment.plate || "无"}</p>
              )}
              {amendment.previousRemark !== amendment.remark && (
                <p>备注：{amendment.previousRemark || "无"} → {amendment.remark || "无"}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {record.status === "dispensed" && (
        <Button size="small" onClick={onAmend}>补录信息</Button>
      )}
    </div>
  );
}
