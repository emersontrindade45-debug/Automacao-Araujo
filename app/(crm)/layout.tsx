import { Shell } from "@/components/layout/shell";
import { mockAtualizacoesPreco } from "@/lib/mock/produtos";

export default function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const precosPendentes = mockAtualizacoesPreco.filter((a) => a.status === "pendente").length;

  return (
    <Shell userName="Usuário" userPapel="atendimento" precosPendentes={precosPendentes}>
      {children}
    </Shell>
  );
}
