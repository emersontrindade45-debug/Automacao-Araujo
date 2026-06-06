import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Papel } from "@/lib/types";

interface ShellProps {
  children: React.ReactNode;
  userName?: string;
  userPapel?: Papel;
  precosPendentes?: number;
  isDev?: boolean;
}

export function Shell({ children, userName, userPapel, precosPendentes, isDev }: ShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface-muted">
      <Sidebar precosPendentes={precosPendentes} papel={userPapel} isDev={isDev} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userPapel={userPapel} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
