import { MonitorUp, Sprout } from 'lucide-react';

export function DesktopRequired() {
  return (
    <main className="desktop-required">
      <span className="brand-mark">
        <Sprout size={21} />
      </span>
      <MonitorUp size={42} />
      <h1>请使用电脑浏览器</h1>
      <p>Token Farmer 当前支持宽度 1180px 以上的桌面屏幕。</p>
    </main>
  );
}
