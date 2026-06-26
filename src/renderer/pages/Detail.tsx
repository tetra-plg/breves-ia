import { useAppStore } from '@renderer/store/app.store';
import { Drawer } from '@renderer/components/Drawer';

export function Detail() {
  const verifyValue = useAppStore((s) => s.verifyValue);
  const drawerKey = useAppStore((s) => s.drawerKey);
  const topic = verifyValue?.topics.find((t) => t.key === drawerKey);
  if (!topic) return <div className="pad" />;
  return <Drawer topic={topic} />;
}
