import { notFound } from "next/navigation";
import Link from "next/link";
import { getClienteById } from "@/lib/supabase/queries/clientes";
import { getPedidosByCliente } from "@/lib/supabase/queries/pedidos";
import { getLogsByCliente } from "@/lib/supabase/queries/logs";
import type { LogEvento } from "@/lib/types";
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

const TIPO_LABELS: Record<string, { label: string; cor: string }> = {
  handoff_pedido_confirmado: { label: "Pedido confirmado", cor: "text-green-600" },
  handoff_ambiguo:           { label: "Handoff para humano", cor: "text-yellow-600" },
  handoff_sem_resposta:      { label: "Sem resposta", cor: "text-red-500" },
  handoff_separacao_completa:{ label: "Separação completa", cor: "text-blue-600" },
};

function LogEventoItem({ log }: { log: LogEvento }) {
  const meta = TIPO_LABELS[log.tipo] ?? { label: log.tipo, cor: "text-muted" };
  const handoff = log.payload?.handoff;
  const proximaAcao = log.payload?.proxima_acao ?? handoff?.proxima_acao;

  return (
    <div className="flex gap-3 p-3 rounded-lg border border-border text-sm">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`font-medium ${meta.cor}`}>{meta.label}</span>
          <span className="text-xs text-subtle shrink-0">{formatData(log.criado_em)}</span>
        </div>
        {proximaAcao && (
          <p className="text-muted mt-1">Próxima ação: {proximaAcao}</p>
        )}
        {handoff?.itens_pedido && handoff.itens_pedido.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {handoff.itens_pedido.map((item, i) => (
              <p key={i} className="text-xs text-muted">
                {item.quantidade}× {item.nome} — {formatMoeda(item.preco_unitario * item.quantidade)}
              </p>
            ))}
          </div>
        )}
        {handoff?.forma_pagamento && (
          <p className="text-xs text-muted mt-1">Pagamento: {handoff.forma_pagamento}</p>
        )}
        {handoff?.endereco_entrega && (
          <p className="text-xs text-muted">Entrega: {handoff.endereco_entrega}</p>
        )}
        {handoff?.ultimas_mensagens && handoff.ultimas_mensagens.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs text-subtle cursor-pointer hover:text-foreground">
              Ver últimas mensagens ({handoff.ultimas_mensagens.length})
            </summary>
            <ul className="mt-1 space-y-0.5 pl-2 border-l border-border">
              {handoff.ultimas_mensagens.map((m, i) => (
                <li key={i} className="text-xs text-muted">{m}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
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

  const [pedidos, logs] = await Promise.all([
    getPedidosByCliente(id),
    getLogsByCliente(id).catch(() => [] as LogEvento[]),
  ]);

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

      {cliente.resumo_ultimo_atendimento && (
        <Card>
          <CardHeader>
            <CardTitle>Último atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{cliente.resumo_ultimo_atendimento}</p>
          </CardContent>
        </Card>
      )}

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
          <CardTitle>Histórico ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <LogEventoItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
