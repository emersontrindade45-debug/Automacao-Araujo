import { notFound } from "next/navigation";
import Link from "next/link";
import { getClienteById } from "@/lib/supabase/queries/clientes";
import { getPedidosByCliente } from "@/lib/supabase/queries/pedidos";
import { EtapaBadge, CanalBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClienteEtapaActions } from "@/components/clientes/cliente-etapa-actions";
import type { Etapa } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

const ETAPAS: Etapa[] = [
  "novo", "atendimento", "fechamento", "pedido_gerado",
  "separacao", "em_rota", "pos_venda", "follow_up", "marketing",
];

function formatData(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatTelefone(tel: string) {
  if (tel.length === 11) return `(${tel.slice(0, 2)}) ${tel.slice(2, 7)}-${tel.slice(7)}`;
  return tel;
}

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const cliente = await getClienteById(id);
    return { title: `${cliente.nome} – Araujo Hub` };
  } catch {
    return { title: "Cliente – Araujo Hub" };
  }
}

export default async function ClienteDetalhe({ params }: Props) {
  const { id } = await params;

  let cliente;
  try {
    cliente = await getClienteById(id);
  } catch {
    notFound();
  }

  const pedidos = await getPedidosByCliente(id);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/clientes" className="hover:text-foreground transition-colors">Clientes</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{cliente.nome}</span>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start gap-4">
            <Avatar name={cliente.nome} size="xl" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-foreground">{cliente.nome}</h1>
              <p className="text-muted text-sm mt-1">{formatTelefone(cliente.telefone)}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <EtapaBadge etapa={cliente.etapa_atual} />
                <CanalBadge canal={cliente.canal_origem} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border text-sm">
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Criado em</p>
              <p className="text-foreground">{formatData(cliente.criado_em)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Último contato</p>
              <p className="text-foreground">{formatData(cliente.atualizado_em)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle uppercase tracking-wide mb-1">Total de pedidos</p>
              <p className="text-foreground font-semibold">{pedidos.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ClienteEtapaActions
        clienteId={cliente.id}
        etapaAtual={cliente.etapa_atual}
        etapas={ETAPAS}
      />

      {pedidos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pedidos ({pedidos.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pedidos.map((p) => (
                <Link key={p.id} href={`/pedidos/${p.id}`} className="block">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-brand/40 hover:bg-surface-subtle transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.itens.length} item(ns)</p>
                      <p className="text-xs text-muted mt-0.5">{formatData(p.criado_em)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{formatMoeda(p.total)}</p>
                      <p className="text-xs text-muted mt-0.5">{p.forma_pagamento}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">Histórico via logs será implementado no M4.</p>
        </CardContent>
      </Card>
    </div>
  );
}
