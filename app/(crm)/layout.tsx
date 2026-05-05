import { Shell } from "@/components/layout/shell";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell userName="Usuário" userPapel="atendimento">
      {children}
    </Shell>
  );
}
