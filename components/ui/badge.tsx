import type { Etapa, CanalOrigem } from "@/lib/types";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | Etapa
  | CanalOrigem;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: "bg-surface-subtle text-muted border border-border",
  success: "bg-success-bg text-success border border-[var(--success-border)]",
  warning: "bg-warning-bg text-warning border border-[var(--warning-border)]",
  danger: "bg-danger-bg text-danger border border-[var(--danger-border)]",
  info: "bg-info-bg text-info border border-[var(--info-border)]",

  /* Etapas */
  novo: "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
  atendimento:
    "bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800",
  fechamento:
    "bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  pedido_gerado:
    "bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  separacao:
    "bg-violet-50 text-violet-600 border border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
  em_rota:
    "bg-orange-50 text-orange-600 border border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  entregue:
    "bg-teal-50 text-teal-600 border border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
  pos_venda:
    "bg-cyan-50 text-cyan-600 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
  follow_up:
    "bg-pink-50 text-pink-600 border border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800",
  marketing:
    "bg-lime-50 text-lime-600 border border-lime-200 dark:bg-lime-950 dark:text-lime-400 dark:border-lime-800",

  /* Canais */
  whatsapp:
    "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  instagram:
    "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800",
  landpage:
    "bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:border-indigo-800",
};

const etapaLabels: Record<Etapa, string> = {
  novo: "Novo",
  atendimento: "Atendimento",
  fechamento: "Fechamento",
  pedido_gerado: "Pedido Gerado",
  separacao: "Separação",
  em_rota: "Em Rota",
  entregue: "Entregue",
  pos_venda: "Pós-venda",
  follow_up: "Follow-up",
  marketing: "Marketing",
};

const canalLabels: Record<CanalOrigem, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  landpage: "Landpage",
};

function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap",
        variantClasses[variant] ?? variantClasses.default,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function EtapaBadge({ etapa }: { etapa: Etapa }) {
  return <Badge variant={etapa}>{etapaLabels[etapa]}</Badge>;
}

function CanalBadge({ canal }: { canal: CanalOrigem }) {
  return <Badge variant={canal}>{canalLabels[canal]}</Badge>;
}

export { Badge, EtapaBadge, CanalBadge, etapaLabels, canalLabels };
export type { BadgeVariant };
