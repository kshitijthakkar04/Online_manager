import { Notch, NotchProvider } from "@/components/notch";
import { Sidebar } from "@/components/sidebar";
import { authEnabled } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NotchProvider>
      <Notch />
      <Sidebar locked={authEnabled()} />
      <main className="min-h-dvh px-4 pt-[72px] pb-32 sm:px-6 md:pt-20 md:pr-8 md:pb-14 md:pl-[116px] xl:pr-12">{children}</main>
    </NotchProvider>
  );
}
