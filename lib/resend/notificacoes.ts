import { Resend } from "resend";

const FROM = "Araujo Hub <noreply@araujo.hub>";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function notificarPrecoParaAprovacao(params: {
  produtoNome: string;
  precoNovo: number;
  precoAtual: number;
  solicitadoPor: string;
  precoId: string;
  adminEmail: string;
}) {
  const { produtoNome, precoNovo, precoAtual, solicitadoPor, precoId, adminEmail } = params;

  const aprovacaoUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/precos?destaque=${precoId}`;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Aprovação de preço: ${produtoNome}`,
    html: `
      <h2>Nova solicitação de atualização de preço</h2>
      <p><strong>Produto:</strong> ${produtoNome}</p>
      <p><strong>Preço atual:</strong> R$ ${precoAtual.toFixed(2)}</p>
      <p><strong>Preço proposto:</strong> R$ ${precoNovo.toFixed(2)}</p>
      <p><strong>Solicitado por:</strong> ${solicitadoPor}</p>
      <p>
        <a href="${aprovacaoUrl}" style="background:#16a34a;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">
          Revisar e aprovar
        </a>
      </p>
    `,
  });

  if (error) {
    console.error("[resend] falha ao enviar notificação de preço:", error);
  }
}

export async function notificarFollowUp(params: {
  clienteNome: string;
  atendente: string;
  adminEmail: string;
}) {
  const { clienteNome, atendente, adminEmail } = params;

  const { error } = await getResend().emails.send({
    from: FROM,
    to: adminEmail,
    subject: `Follow-up iniciado: ${clienteNome}`,
    html: `
      <h2>Follow-up automático acionado</h2>
      <p>O cliente <strong>${clienteNome}</strong> foi movido para follow-up e uma mensagem de reativação foi disparada via N8n.</p>
      <p><strong>Responsável:</strong> ${atendente}</p>
    `,
  });

  if (error) {
    console.error("[resend] falha ao enviar notificação de follow-up:", error);
  }
}
