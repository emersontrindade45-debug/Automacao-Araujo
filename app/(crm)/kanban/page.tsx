import { KanbanBoard } from "@/components/kanban/kanban-board";
import { getClientes } from "@/lib/supabase/queries/clientes";

export const metadata = { title: "Kanban – Araujo Hub" };

export default async function KanbanPage() {
  const clientes = await getClientes();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Kanban</h1>
          <p className="text-sm text-muted mt-0.5">Pipeline de atendimento</p>
        </div>
        <span className="text-xs text-subtle bg-surface-subtle px-3 py-1 rounded-full border border-border">
          {clientes.length} contatos ativos
        </span>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard initialClientes={clientes} />
      </div>
    </div>
  );
}
