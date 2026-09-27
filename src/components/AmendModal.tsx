import { useState } from "react";
import { CONTAINER_TYPES } from "../fuel/config";
import { FIELD_LABEL, type AmendableField, type FuelOrder } from "../fuel/types";

interface Props {
  order: FuelOrder;
  onClose: () => void;
  onSubmit: (change: { field: AmendableField; to: string; reason: string }) => void;
}

const FIELDS: AmendableField[] = ["name", "containerType", "plate", "liters"];

// 已出油记录冻结：只能补录，必须写原因，原值随补录记录保留
export default function AmendModal({ order, onClose, onSubmit }: Props) {
  const [field, setField] = useState<AmendableField>("liters");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  function currentValueOf(key: AmendableField): string {
    const last = [...order.amendments].reverse().find((item) => item.field === key);
    return last?.to ?? String(order[key] ?? "");
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!reason.trim() || !String(to).trim()) return;
    onSubmit({ field, to, reason });
  }

  const currentValue = currentValueOf(field);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={submit}>
        <h3>补录已出油记录</h3>
        <p className="panel-hint">
          已出油记录已冻结，原字段值会保留并显示“原值 → 新值”。单据：{order.name} / {order.idNumber}
        </p>

        <label>
          补录字段
          <select
            value={field}
            onChange={(event) => {
              setField(event.target.value as AmendableField);
              setTo("");
            }}
          >
            {FIELDS.map((key) => (
              <option key={key} value={key}>
                {FIELD_LABEL[key]}（现值：{currentValueOf(key)}）
              </option>
            ))}
          </select>
        </label>

        <label>
          补录后的{FIELD_LABEL[field]}
          {field === "containerType" ? (
            <select value={to} onChange={(event) => setTo(event.target.value)}>
              <option value="">请选择</option>
              {CONTAINER_TYPES.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          ) : (
            <input
              type={field === "liters" ? "number" : "text"}
              step="0.1"
              min="0.1"
              value={to}
              placeholder={`原值：${currentValue}`}
              onChange={(event) => setTo(event.target.value)}
            />
          )}
        </label>

        <label>
          补录原因（必填）
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="例：实际加注升数与登记不符，已与小票核对"
          />
        </label>

        {touched && (!reason.trim() || !String(to).trim()) && (
          <span className="field-error">补录值和原因都必须填写</span>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>取消</button>
          <button type="submit" className="primary">保存补录（不改原值）</button>
        </div>
      </form>
    </div>
  );
}
