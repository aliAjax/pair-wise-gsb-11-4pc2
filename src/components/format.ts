// 展示用格式化
export function maskId(idNumber: string): string {
  if (idNumber.length < 10) return idNumber;
  return `${idNumber.slice(0, 6)}********${idNumber.slice(-4)}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}
