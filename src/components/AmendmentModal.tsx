// 补录弹窗：已出油记录冻结，仅可补录容器/车牌/备注，必须写原因并保留原值
import { App as AntApp, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import { CONTAINER_TYPES } from "../types";
import type { FuelRecord } from "../types";
import { usePurchaseStore } from "../lib/store";
import { validatePlate } from "../lib/customer";

export type AmendFormValues = {
  reason: string;
  operator: string;
  container?: string;
  plate?: string;
  remark?: string;
};

type Props = {
  record: FuelRecord | null;
  onClose: () => void;
};

export default function AmendmentModal({ record, onClose }: Props) {
  const { message } = AntApp.useApp();
  const amend = usePurchaseStore((state) => state.amend);
  const [form] = Form.useForm<AmendFormValues>();

  useEffect(() => {
    if (record) {
      form.setFieldsValue({
        reason: "",
        operator: "",
        container: record.container,
        plate: record.plate,
        remark: record.remark
      });
    }
  }, [record, form]);

  function handleOk() {
    if (!record) return;
    form.validateFields().then((values) => {
      const changed =
        (values.container ?? "") !== record.container ||
        (values.plate ?? "").trim().toUpperCase() !== record.plate ||
        (values.remark ?? "") !== record.remark;
      if (!changed) {
        message.warning("没有任何变更，无需补录");
        return;
      }
      amend(record.id, {
        reason: values.reason,
        operator: values.operator,
        container: values.container,
        plate: values.plate,
        remark: values.remark
      });
      message.success("补录已保存，原值留痕");
      onClose();
    });
  }

  return (
    <Modal
      title={`补录 —— ${record?.name ?? ""}（升数 ${record?.liters ?? ""}L 不可改）`}
      open={!!record}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存补录"
      cancelText="取消"
      destroyOnClose
    >
      <p className="hint">记录已出油冻结，姓名、证件号、升数不可修改；变更原值需写明原因，原值在记录中保留。</p>
      <Form form={form} layout="vertical">
        <Form.Item
          label="补录原因（必填）"
          name="reason"
          rules={[{ required: true, message: "请填写补录原因" }]}
        >
          <Input.TextArea rows={2} maxLength={100} showCount placeholder="如：顾客离场后核对票据，发现车牌登记错误" />
        </Form.Item>
        <Form.Item
          label="经办人"
          name="operator"
          rules={[{ required: true, message: "请填写经办人" }]}
        >
          <Input maxLength={10} placeholder="补录经办人姓名" />
        </Form.Item>
        <Form.Item label={`容器类型（原值：${record?.container ?? "-"}）`} name="container">
          <Input
            list="amend-container-options"
            placeholder="选择或输入容器类型"
            maxLength={10}
          />
          <datalist id="amend-container-options">
            {CONTAINER_TYPES.map((item) => <option key={item} value={item} />)}
          </datalist>
        </Form.Item>
        <Form.Item
          label={`车牌号（原值：${record?.plate || "无"}）`}
          name="plate"
          rules={[{ validator: (_, value: string | null) => {
            const error = validatePlate(value ?? "");
            return error ? Promise.reject(new Error(error)) : Promise.resolve();
          } }]}
        >
          <Input maxLength={8} placeholder="不填表示无车牌" />
        </Form.Item>
        <Form.Item label={`备注（原值：${record?.remark || "无"}）`} name="remark">
          <Input.TextArea rows={2} maxLength={100} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
}
