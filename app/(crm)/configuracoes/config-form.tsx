"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { salvarConfigFollowUpAction, type ConfigFollowUp } from "./actions";

interface ConfigFormProps {
  config: ConfigFollowUp;
}

export function ConfigForm({ config: inicial }: ConfigFormProps) {
  const [dias, setDias] = useState(String(inicial.dias_inatividade));
  const [tentativas, setTentativas] = useState(String(inicial.max_tentativas));
  const [mensagem, setMensagem] = useState(inicial.mensagem);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);

    const config: ConfigFollowUp = {
      dias_inatividade: Math.max(1, parseInt(dias) || 3),
      max_tentativas: Math.max(1, parseInt(tentativas) || 3),
      mensagem: mensagem.trim() || "Olá! Podemos ajudar?",
    };

    startTransition(async () => {
      try {
        await salvarConfigFollowUpAction(config);
        setSalvo(true);
        setTimeout(() => setSalvo(false), 3000);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="dias">
          Dias de inatividade para acionar follow-up
        </label>
        <Input
          id="dias"
          type="number"
          min={1}
          max={30}
          value={dias}
          onChange={(e) => setDias(e.target.value)}
          className="w-28"
        />
        <p className="text-xs text-muted">
          Clientes em "follow_up" sem atualização por este número de dias receberão a mensagem.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="tentativas">
          Número máximo de tentativas
        </label>
        <Input
          id="tentativas"
          type="number"
          min={1}
          max={10}
          value={tentativas}
          onChange={(e) => setTentativas(e.target.value)}
          className="w-28"
        />
        <p className="text-xs text-muted">
          Após este número de tentativas sem resposta, o cliente é movido para "marketing".
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="mensagem">
          Mensagem padrão de reativação
        </label>
        <Textarea
          id="mensagem"
          rows={3}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Olá! Vimos que você ainda não finalizou seu pedido. Podemos ajudar?"
        />
        <p className="text-xs text-muted">
          Mensagem enviada via N8n ao acionar o follow-up.
        </p>
      </div>

      {erro && (
        <p className="text-sm text-danger">{erro}</p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar configurações"}
        </Button>
        {salvo && (
          <span className="text-sm text-success font-medium">Configurações salvas!</span>
        )}
      </div>
    </form>
  );
}
