import type { ReactNode } from 'react';

/** Visual wrapper only. Pages retain ownership of data, permissions and actions. */
export default function PageLayout({ children }: { children: ReactNode }) {
  return <div className="functional-page">{children}</div>;
}
