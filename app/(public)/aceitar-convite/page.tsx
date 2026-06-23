"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AceitarConvitePage() {
  return (
    <Suspense>
      <AceitarConviteContent />
    </Suspense>
  );
}

function AceitarConviteContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const [erro, setErro] = useState(false);

  function aceitar() {
    if (!url) {
      setErro(true);
      return;
    }
    window.location.href = url;
  }

  if (!url || erro) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <p className="text-sm text-muted">
          Link inválido ou expirado. Solicite um novo e-mail na tela de login.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6 text-center">
      <div>
        <h1 className="text-xl font-bold text-brand">Você foi convidado</h1>
        <p className="mt-1 text-sm text-muted">
          Clique no botão abaixo para acessar o Araujo Hub.
        </p>
      </div>
      <Button type="button" variant="primary" className="w-full" onClick={aceitar}>
        Aceitar convite
      </Button>
    </div>
  );
}
