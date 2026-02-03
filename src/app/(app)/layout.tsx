// src/app/(app)/layout.tsx
import AppChrome from "./components/AppChrome";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}
