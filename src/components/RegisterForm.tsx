import { useMemo, useState } from "react";
import { CONTAINER_TYPES, DAILY_LIMIT_LITERS } from "../fuel/config";
import { dayKeyOf } from "../fuel/format";
import {
  isLikelyPlate,
  isValidIdNumber,
  normalizeIdNumber,
  normalizePlate
} from "../fuel/customers";
import { activeLitersOfDay, initialStatusFor, round2 } from "../fuel/quota";
import { useFuelStore } from "../fuel/store";

interface Props {
  notify: (ok: boolean, message: string) => void;
}

export default function RegisterForm({ notify }: Props) {
  const orders = useFuelStore((state) => state.orders);
  const customers = useFuelStore((state) => state.customers);
  const submit = useFuelStore((state) => state.submit);

  const [idNumber, setIdNumber] = useState("");
  const [name, setName] = useState("");
  const [containerType, setContainerType] = useState<string>(CONTAINER_TYPES[0]);
  const [plate, setPlate] = useState("");
  const [litersText, setLitersText] = useState("");
  const [idTouched, setIdTouched] = useState(false);

  const normalizedId = normalizeIdNumber(idNumber);
  const idValid = isValidIdNumber(normalizedId);
  const knownCustomer = idValid ? customers.find((item) => item.idNumber === normalizedId) : undefined;

  const todayTotal = useMemo(() => {
    if (!idValid) return 0;
    return activeLitersOfDay(orders, normalizedId, dayKeyOf(new Date().toISOString()));
  }, [orders, normalizedId, idValid]);

  const liters = Number(litersText) || 0;
  const projected = idValid && liters > 0 ? round2(todayTotal + liters) : todayTotal;
  const willPending = idValid && liters > 0 && initialStatusFor(todayTotal, liters) === "pending";

  function applyKnownCustomer() {
    if (!knownCustomer) return;
    if (!name.trim()) setName(knownCustomer.name);
    if (!knownCustomer.lastPlate) return;
    setPlate((current) => current || knownCustomer.lastPlate || "");
    if (knownCustomer.lastContainer) setContainerType(knownCustomer.lastContainer);
  }

  function reset() {
    setIdNumber("");
    setName("");
    setContainerType(CONTAINER_TYPES[0]);
    setPlate("");
    setLitersText("");
    setIdTouched(false);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIdTouched(true);
    if (!idValid) {
      notify(false, "证件号格式或校验位不正确，请核对身份证");
      return;
    }
    if (!name.trim()) {
      notify(false, "请录入顾客姓名");
      return;
    }
    if (!(liters > 0)) {
      notify(false, "本次升数必须大于0");
      return;
    }
    if (plate.trim() && !isLikelyPlate(plate)) {
      notify(false, "车牌格式不对，无车辆可留空");
      return;
    }
    const result = submit({
      idNumber: normalizedId,
      name,
      containerType,
      plate: normalizePlate(plate),
      liters
    });
    notify(result.ok, result.message);
    if (result.ok) reset();
  }

  const limitPercent = Math.min(100, (Math.min(todayTotal, DAILY_LIMIT_LITERS) / DAILY_LIMIT_LITERS) * 100);

  return (
    <form className="panel register-form" onSubmit={handleSubmit}>
      <h2>实名购油登记</h2>
      <p className="panel-hint">顾客出示身份证后录入，同一证件当日累计满 {DAILY_LIMIT_LITERS} 升先送站长核验。</p>

      <div className="form-grid">
        <label>
          身份证号
          <input
            value={idNumber}
            onChange={(event) => setIdNumber(event.target.value)}
            onBlur={applyKnownCustomer}
            placeholder="18位身份证号"
            inputMode="text"
            maxLength={18}
          />
          {idTouched && !idValid && <span className="field-error">证件号格式或校验位不正确</span>}
          {idValid && knownCustomer && (
            <span className="field-hint">老顾客：{knownCustomer.name}，历史登记 {knownCustomer.visits} 次</span>
          )}
          {idValid && !knownCustomer && <span className="field-hint">新顾客，登记后自动建档</span>}
        </label>

        <label>
          姓名
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="与身份证一致" />
        </label>

        <label>
          容器类型
          <select value={containerType} onChange={(event) => setContainerType(event.target.value)}>
            {CONTAINER_TYPES.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          车牌（无车可留空）
          <input
            value={plate}
            onChange={(event) => setPlate(event.target.value)}
            placeholder="例：京A12345"
            maxLength={8}
          />
        </label>

        <label>
          本次升数（L）
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={litersText}
            onChange={(event) => setLitersText(event.target.value)}
            placeholder="散装汽油升数"
          />
        </label>

        {idValid && (
          <div className={`quota-box ${todayTotal >= DAILY_LIMIT_LITERS ? "over" : ""}`}>
            <div className="quota-line">
              <span>今日该证件已登记</span>
              <strong>{todayTotal} / {DAILY_LIMIT_LITERS} L</strong>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${limitPercent}%` }} />
            </div>
            {liters > 0 && (
              <p className={willPending ? "quota-warn" : "field-hint"}>
                {willPending
                  ? `提交后累计 ${projected} 升，将进入待核验区，需站长确认`
                  : `提交后累计 ${projected} 升，可直接出油`}
              </p>
            )}
          </div>
        )}

        <button type="submit" className="primary">提交登记</button>
      </div>
    </form>
  );
}
