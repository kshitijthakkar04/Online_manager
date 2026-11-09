import { Notch, NotchProvider } from "@/components/notch";
import { Sidebar } from "@/components/sidebar";
import { authEnabled } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotchProvider>
      <Notch />
      <Sidebar locked={authEnabled()} />
      <main className="min-h-dvh px-4 pt-16 pb-28 sm:px-6 md:pb-12 md:pl-[100px] lg:pr-8">{children}</main>
    </NotchProvider>
  );
}
