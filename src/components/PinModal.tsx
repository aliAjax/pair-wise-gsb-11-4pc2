import { useState } from "react";
import { STATION_MASTER_PIN } from "../fuel/config";

interface Props {
  onClose: () => void;
  onPass: (operator: string) => void;
}

// 站长确认口令窗：确认人即站长本人，口令仅本机演示
export default function PinModal({ onClose, onPass }: Props) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pin !== STATION_MASTER_PIN) {
      setError("站长口令不正确");
      return;
    }
    onPass("站长");
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h3>站长核验</h3>
        <p className="panel-hint">达到当日限额的单据需站长输入口令确认后才能出油。</p>
        <label>
          站长口令
          <input
            type="password"
            value={pin}
            autoFocus
            maxLength={6}
            placeholder="演示口令 888888"
            onChange={(event) => {
              setPin(event.target.value);
              setError("");
            }}
          />
        </label>
        {error && <span className="field-error">{error}</span>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>取消</button>
          <button type="submit" className="primary">核验通过并放行</button>
        </div>
      </form>
    </div>
  );
}
