import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const N8N_BASE = process.env.N8N_API_URL ?? "";
const N8N_API_KEY = process.env.N8N_API_KEY ?? "";
const EVO_URL = process.env.EVOLUTION_API_URL ?? "";
const EVO_KEY = process.env.EVOLUTION_API_KEY ?? "";
const DEV_PHONE = process.env.DEV_WHATSAPP_NUMBER ?? "";

// ---------- implementações das ferramentas ----------

async function restartWorkflow(workflowId: string): Promise<string> {
  const res = await fetch(`${N8N_BASE}/workflows/${workflowId}/activate`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": N8N_API_KEY },
  });
  return res.ok ? "workflow reativado com sucesso" : `erro ao reativar: ${res.status}`;
}

async function retryExecution(executionId: string): Promise<string> {
  const res = await fetch(`${N8N_BASE}/executions/${executionId}/retry`, {
    method: "POST",
    headers: { "X-N8N-API-KEY": N8N_API_KEY },
  });
  return res.ok ? "execução re-disparada com sucesso" : `erro ao re-executar: ${res.status}`;
}

async function checkServiceStatus(service: string): Promise<string> {
  const checks: Record<string, () => Promise<boolean>> = {
    supabase: async () => {
      const sb = createAdminClient();
      const { error } = await sb.from("clientes").select("id").limit(1);
      return !error;
    },
    n8n: async () => {
      const res = await fetch(`${N8N_BASE}/healthz`, {
        headers: { "X-N8N-API-KEY": N8N_API_KEY },
      });
      return res.ok;
    },
    openai: async () => {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
      });
      return res.ok;
    },
    evoapi: async () => {
      const res = await fetch(`${EVO_URL}/instance/fetchInstances`, {
        headers: { apikey: EVO_KEY },
      });
      return res.ok;
    },
  };

  const check = checks[service.toLowerCase()];
  if (!check) return `serviço "${service}" não reconhecido`;
  const ok = await check().catch(() => false);
  return ok ? `${service}: operacional` : `${service}: fora do ar`;
}

async function notifyDeveloper(mensagem: string): Promise<string> {
  if (!DEV_PHONE || !EVO_URL) return "DEV_WHATSAPP_NUMBER ou EVOLUTION_API_URL não configurados";
  const res = await fetch(`${EVO_URL}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: EVO_KEY },
    body: JSON.stringify({
      number: DEV_PHONE,
      text: `🛠️ *Alerta de Manutenção*\n\n${mensagem}`,
    }),
  });
  return res.ok ? "desenvolvedor notificado via WhatsApp" : `erro ao notificar: ${res.status}`;
}

async function logDiagnostico(erroId: string, mensagem: string): Promise<string> {
  const sb = createAdminClient();
  const { data } = await sb
    .from("manutencao_erros")
    .select("tentativas_ia")
    .eq("id", erroId)
    .single();

  const tentativas = (data?.tentativas_ia as unknown[]) ?? [];
  tentativas.push({ ts: new Date().toISOString(), passo: mensagem });

  await sb
    .from("manutencao_erros")
    .update({ tentativas_ia: tentativas })
    .eq("id", erroId);

  return "passo registrado";
}

// ---------- definição das ferramentas para o modelo ----------

const tools: Anthropic.Tool[] = [
  {
    name: "restart_workflow",
    description: "Reativa um workflow desabilitado no n8n via API",
    input_schema: {
      type: "object" as const,
      properties: { workflow_id: { type: "string", description: "ID do workflow no n8n" } },
      required: ["workflow_id"],
    },
  },
  {
    name: "retry_execution",
    description: "Re-executa a última execução falha de um workflow no n8n",
    input_schema: {
      type: "object" as const,
      properties: { execution_id: { type: "string", description: "ID da execução no n8n" } },
      required: ["execution_id"],
    },
  },
  {
    name: "check_service_status",
    description: "Verifica se um serviço está operacional. Serviços: supabase, n8n, openai, evoapi",
    input_schema: {
      type: "object" as const,
      properties: { service: { type: "string", description: "Nome do serviço a verificar" } },
      required: ["service"],
    },
  },
  {
    name: "log_diagnostico",
    description: "Persiste um passo do raciocínio na tabela de erros para auditoria",
    input_schema: {
      type: "object" as const,
      properties: {
        erro_id: { type: "string", description: "UUID do registro em manutencao_erros" },
        mensagem: { type: "string", description: "Descrição do passo ou conclusão" },
      },
      required: ["erro_id", "mensagem"],
    },
  },
  {
    name: "notify_developer",
    description: "Envia mensagem WhatsApp ao desenvolvedor. Usar SOMENTE após esgotar todas as tentativas.",
    input_schema: {
      type: "object" as const,
      properties: { mensagem: { type: "string", description: "Mensagem de diagnóstico em PT-BR" } },
      required: ["mensagem"],
    },
  },
];

// ---------- executor de ferramentas ----------

async function executarFerramenta(
  nome: string,
  input: Record<string, string>,
  erroId: string
): Promise<string> {
  switch (nome) {
    case "restart_workflow":
      return restartWorkflow(input.workflow_id);
    case "retry_execution":
      return retryExecution(input.execution_id);
    case "check_service_status":
      return checkServiceStatus(input.service);
    case "log_diagnostico":
      return logDiagnostico(erroId, input.mensagem);
    case "notify_developer":
      return notifyDeveloper(input.mensagem);
    default:
      return `ferramenta "${nome}" não reconhecida`;
  }
}

// ---------- agente principal ----------

export interface ErroPayload {
  id: string;
  source: string;
  workflow_name?: string;
  node_name?: string;
  route?: string;
  error_message: string;
  error_stack?: string;
  context?: unknown;
}

export async function executarAgenteManutencao(erro: ErroPayload): Promise<{
  status: "resolvido_ia" | "sem_solucao";
  diagnostico: string;
}> {
  const sb = createAdminClient();

  const prompt = `Você é um agente de manutenção autônomo do sistema de automação de atendimento do Mercado Araújo.

Você recebeu o seguinte erro para analisar e tentar resolver:

**Fonte:** ${erro.source}
**Workflow/Rota:** ${erro.workflow_name ?? erro.route ?? "desconhecido"}
**Nó:** ${erro.node_name ?? "N/A"}
**Mensagem:** ${erro.error_message}
**Stack:** ${erro.error_stack ?? "não disponível"}
**Contexto:** ${JSON.stringify(erro.context ?? {}, null, 2)}

**Instruções:**
1. Use log_diagnostico para registrar cada passo do raciocínio (erro_id: "${erro.id}")
2. Tente diagnosticar a causa raiz
3. Execute até 3 estratégias de resolução sequenciais (verifique serviços, tente retry, reinicie workflow)
4. Se resolver, retorne uma explicação clara em PT-BR
5. Se NÃO resolver após 3 tentativas, use notify_developer com diagnóstico completo
6. Sempre registre o diagnóstico final com log_diagnostico`;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  let diagnosticoFinal = "Agente não produziu diagnóstico";
  let resolvido = false;
  let iteracoes = 0;
  const MAX_ITERACOES = 10;

  while (iteracoes < MAX_ITERACOES) {
    iteracoes++;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      tools,
      messages,
    });

    // Coleta texto de diagnóstico
    for (const block of response.content) {
      if (block.type === "text" && block.text.trim()) {
        diagnosticoFinal = block.text.trim();
      }
    }

    if (response.stop_reason === "end_turn") {
      resolvido = true;
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    // Processa chamadas de ferramentas
    const toolUses = response.content.filter((b) => b.type === "tool_use");
    if (toolUses.length === 0) break;

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUses) {
      if (block.type !== "tool_use") continue;
      const resultado = await executarFerramenta(
        block.name,
        block.input as Record<string, string>,
        erro.id
      );
      if (block.name === "notify_developer") resolvido = false;
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultado });
    }

    messages.push({ role: "user", content: toolResults });
  }

  const statusFinal: "resolvido_ia" | "sem_solucao" = resolvido ? "resolvido_ia" : "sem_solucao";

  await sb
    .from("manutencao_erros")
    .update({
      status: statusFinal,
      diagnostico_ia: diagnosticoFinal,
      resolved_at: resolvido ? new Date().toISOString() : null,
    })
    .eq("id", erro.id);

  return { status: statusFinal, diagnostico: diagnosticoFinal };
}
