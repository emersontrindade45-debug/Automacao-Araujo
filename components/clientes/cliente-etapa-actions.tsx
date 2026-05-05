"use client";

import { useState } from "react";
import type { Etapa } from "@/lib/types";
import { EtapaBadge, etapaLabels } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ClienteEtapaActionsProps {
  clienteId: string;
  etapaAtual: Etapa;
  etapas: Etapa[];
}

export function ClienteEtapaActions({ clienteId, etapaAtual, etapas }: ClienteEtapaActionsProps) {
  const [etapa, setEtapa] = useState<Etapa>(etapaAtual);
  const etapaIndex = etapas.indexOf(etapa);
  const proximaEtapa = etapaIndex < etapas.length - 1 ? etapas[etapaIndex + 1] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Etapa atual</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <EtapaBadge etapa={etapa} />
          {proximaEtapa && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEtapa(proximaEtapa)}
            >
              Mover para {etapaLabels[proximaEtapa]}
            </Button>
          )}
          {!proximaEtapa && (
            <span className="text-xs text-muted">Etapa final atingida</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
