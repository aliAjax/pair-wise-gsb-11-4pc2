// 录入台：顾客出示身份证后录入姓名、证件号、容器类型、车牌、本次升数
import { useMemo } from "react";
import { App as AntApp, Button, Form, Input, InputNumber, Select } from "antd";
import { CONTAINER_TYPES } from "../types";
import type { PurchaseInput } from "../types";
import { usePurchaseStore } from "../lib/store";
import { DAILY_LIMIT_LITERS, dailyTotal, localDateOf } from "../lib/quota";
import { findCustomer, normalizeIdNumber, validateIdNumber, validatePlate } from "../lib/customer";

type FormValues = {
  name: string;
  idNumber: string;
  container: string;
  plate?: string;
  liters: number;
  remark?: string;
};

export default function RegistrationForm() {
  const [form] = Form.useForm<FormValues>();
  const { message } = AntApp.useApp();
  const records = usePurchaseStore((state) => state.records);
  const customers = usePurchaseStore((state) => state.customers);
  const addPurchase = usePurchaseStore((state) => state.addPurchase);

  const idValue = Form.useWatch("idNumber", form) as string | undefined;
  const today = localDateOf(new Date().toISOString());
  const totalToday = useMemo(
    () => (idValue ? dailyTotal(records, idValue, today) : 0),
    [records, idValue, today]
  );
  const remaining = DAILY_LIMIT_LITERS - totalToday;

  function fillKnownName() {
    const raw = form.getFieldValue("idNumber");
    if (!raw || validateIdNumber(raw)) return;
    const known = findCustomer(customers, raw);
    if (known) form.setFieldValue("name", known.name);
  }

  function handleSubmit(values: FormValues) {
    const input: PurchaseInput = {
      name: values.name,
      idNumber: normalizeIdNumber(values.idNumber),
      container: values.container,
      plate: values.plate ?? "",
      liters: Number(values.liters),
      remark: values.remark ?? ""
    };
    const result = addPurchase(input);
    if (!result.ok) {
      message.error(result.error);
      return;
    }
    message.success(
      result.record.status === "pending"
        ? "登记成功：今日累计已达 20L，已进入待核验区"
        : "登记成功，可出油"
    );
    form.resetFields();
  }

  return (
    <section className="panel">
      <h2>实名购油登记</h2>
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={handleSubmit}
      >
        <Form.Item
          label="身份证号"
          name="idNumber"
          rules={[
            { required: true, message: "请录入身份证号" },
            { validator: (_, value: string | null) => {
              const error = validateIdNumber(value ?? "");
              return error ? Promise.reject(new Error(error)) : Promise.resolve();
            } }
          ]}
          extra={
            totalToday > 0
              ? `该证件今日已累计 ${totalToday}L，剩余额度 ${Math.max(0, remaining)}L${remaining <= 0 ? "，本单需站长确认" : ""}`
              : undefined
          }
        >
          <Input
            placeholder="请输入 18 位身份证号"
            maxLength={18}
            onBlur={fillKnownName}
          />
        </Form.Item>

        <Form.Item
          label="姓名"
          name="name"
          rules={[{ required: true, message: "请录入顾客姓名" }]}
        >
          <Input placeholder="与身份证一致" maxLength={20} />
        </Form.Item>

        <Form.Item
          label="容器类型"
          name="container"
          rules={[{ required: true, message: "请选择容器类型" }]}
        >
          <Select placeholder="请选择" options={CONTAINER_TYPES.map((item) => ({ value: item, label: item }))} />
        </Form.Item>

        <Form.Item
          label="车牌号（无车可留空）"
          name="plate"
          rules={[{ validator: (_, value: string | null) => {
            const error = validatePlate(value ?? "");
            return error ? Promise.reject(new Error(error)) : Promise.resolve();
          } }]}
        >
          <Input placeholder="如 京A12345" maxLength={8} />
        </Form.Item>

        <Form.Item
          label="本次购油（升）"
          name="liters"
          rules={[{ required: true, message: "请录入本次升数" }]}
        >
          <InputNumber min={0.1} max={1000} step={1} precision={2} style={{ width: "100%" }} placeholder="单位：升" />
        </Form.Item>

        <Form.Item label="备注" name="remark">
          <Input.TextArea rows={2} maxLength={100} showCount placeholder="用油用途等说明（选填）" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          提交登记
        </Button>
      </Form>
    </section>
  );
}
