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
  const [mensagens, setMensagens] = useState<string[]>(inicial.mensagens);
  const [intervalos, setIntervalos] = useState<string[]>(
    inicial.intervalos_dias.map(String)
  );
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function atualizarMensagem(idx: number, valor: string) {
    setMensagens(prev => prev.map((m, i) => i === idx ? valor : m));
  }

  function atualizarIntervalo(idx: number, valor: string) {
    setIntervalos(prev => prev.map((v, i) => i === idx ? valor : v));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setSalvo(false);

    const config: ConfigFollowUp = {
      dias_inatividade: Math.max(1, parseInt(dias) || 1),
      max_tentativas: Math.max(1, parseInt(tentativas) || 3),
      mensagem: mensagens[0] ?? "",
      mensagens: mensagens.map(m => m.trim() || "Olá! Podemos ajudar?"),
      intervalos_dias: intervalos.map(v => Math.max(1, parseInt(v) || 1)),
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

  const rotulosTentativa = ["1ª tentativa", "2ª tentativa", "3ª tentativa"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">

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
          Clientes em atendimento sem resposta por este número de dias entram no ciclo de follow-up.
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

      <div className="space-y-4">
        <p className="text-sm font-medium text-foreground">
          Mensagens e intervalos por tentativa
        </p>
        <p className="text-xs text-muted -mt-2">
          Use <code className="bg-muted/40 px-1 rounded">{"{nome}"}</code> para inserir o nome do cliente. O intervalo é quantos dias aguardar desde a tentativa anterior.
        </p>

        {mensagens.map((msg, idx) => (
          <div key={idx} className="border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{rotulosTentativa[idx] ?? `${idx + 1}ª tentativa`}</span>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted">Aguardar</label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={intervalos[idx] ?? "1"}
                  onChange={(e) => atualizarIntervalo(idx, e.target.value)}
                  className="w-16 text-center"
                />
                <span className="text-xs text-muted">dia(s)</span>
              </div>
            </div>
            <Textarea
              rows={2}
              value={msg}
              onChange={(e) => atualizarMensagem(idx, e.target.value)}
              placeholder={`Mensagem da ${rotulosTentativa[idx] ?? `${idx + 1}ª tentativa`}`}
            />
          </div>
        ))}
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
