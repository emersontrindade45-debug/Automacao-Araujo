import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Araujo Hub — Atendimento Inteligente para o seu Comércio",
  description:
    "Automatize seu atendimento via WhatsApp e Instagram. CRM integrado, pedidos organizados e clientes satisfeitos.",
};

export default function LandPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-xl w-full space-y-8">
          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 border border-brand-100">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Automação de Atendimento
          </span>

          {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Atendimento inteligente
              <br />
              <span className="text-brand">para o seu comércio</span>
            </h1>
            <p className="text-muted text-lg leading-relaxed">
              Centralize WhatsApp, Instagram e site em um só lugar.
              Automatize respostas, gerencie pedidos e nunca perca um cliente.
            </p>
          </div>

          {/* Benefícios */}
          <ul className="flex flex-col gap-2 text-sm text-muted text-left">
            {[
              "Atendimento 24h via WhatsApp e Instagram",
              "CRM com Kanban visual por etapa do pedido",
              "Handoff automático para sua equipe",
              "Atualização de preços por mensagem de voz",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-success shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l7.879-7.879a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {item}
              </li>
            ))}
          </ul>

          {/* Form card */}
          <div className="bg-surface border border-border rounded-2xl shadow-md p-6 text-left space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Fale com a gente
              </h2>
              <p className="text-sm text-muted">
                Deixe seus dados e entraremos em contato.
              </p>
            </div>
            <LeadForm />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-subtle">
        © {new Date().getFullYear()} Araujo Hub. Todos os direitos reservados.
      </footer>
    </div>
  );
}

function LeadForm() {
  async function submitLead(formData: FormData) {
    "use server";
    const nome = formData.get("nome") as string;
    const telefone = formData.get("telefone") as string;
    const canal = formData.get("canal") as string;

    if (!nome || !telefone || !canal) return;

    /* Persistência será adicionada no M3 */
    console.log("Novo lead:", { nome, telefone, canal });
  }

  return (
    <form action={submitLead} className="space-y-4">
      <Input
        name="nome"
        label="Nome completo"
        placeholder="Ex: Maria Silva"
        required
        autoComplete="name"
      />
      <Input
        name="telefone"
        label="WhatsApp"
        type="tel"
        placeholder="(11) 99999-0000"
        required
        autoComplete="tel"
      />
      <Select
        name="canal"
        label="Como nos encontrou?"
        placeholder="Selecione..."
        required
      >
        <option value="whatsapp">WhatsApp</option>
        <option value="instagram">Instagram</option>
        <option value="landpage">Site</option>
      </Select>
      <Button type="submit" className="w-full" size="lg">
        Quero conhecer o sistema
      </Button>
      <p className="text-xs text-center text-subtle">
        Sem spam. Seus dados ficam seguros conosco.
      </p>
    </form>
  );
}
