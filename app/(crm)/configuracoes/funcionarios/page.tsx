import { AccessRestricted } from "@/components/configuracoes/access-restricted";
import { listarFuncionarios } from "@/lib/supabase/queries/funcionarios";
import { isAdminUser } from "@/lib/auth/papel";
import { FuncionariosForm } from "./funcionarios-form";
import { FuncionariosList } from "./funcionarios-list";

export const metadata = { title: "Funcionários autorizados – Araujo Hub" };

export default async function FuncionariosConfigPage() {
  if (!(await isAdminUser())) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Funcionários autorizados</h2>
          <p className="text-sm text-muted mt-0.5">
            Quem pode solicitar alterações de preço via WhatsApp.
          </p>
        </div>
        <AccessRestricted descricao="Somente administradores gerenciam funcionários autorizados." />
      </div>
    );
  }

  const funcionarios = await listarFuncionarios();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Funcionários autorizados</h2>
        <p className="text-sm text-muted mt-0.5">
          Funcionários que podem solicitar alterações de preço via WhatsApp.
        </p>
      </div>
      <FuncionariosForm />
      <FuncionariosList funcionarios={funcionarios} />
    </div>
  );
}
