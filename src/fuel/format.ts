// 全部按本机本地时间生成键，保证“当天”“同一分钟”与加油员看到的时钟一致

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function dayKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function minuteKeyOf(iso: string): string {
  const d = new Date(iso);
  return `${dayKeyOf(iso)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function todayKey(): string {
  return dayKeyOf(new Date().toISOString());
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatDateTime(iso: string): string {
  return `${dayKeyOf(iso)} ${formatTime(iso)}`;
}
