# -*- coding: utf-8 -*-
"""
Ativa em lotes os produtos do ERP (ativo=false, sem embedding) -> ativo=true.
Cada ativacao dispara o trigger produtos_embedding_trigger -> 1 POST ao Fluxo 10
(webhook /atualizar-embeddings-produtos) -> gera embedding via OpenAI.

Por isso ativamos em LOTES PEQUENOS com PAUSA, deixando o Fluxo 10 (1 produto/exec)
drenar a fila do pg_net sem rajada / rate-limit.

Estrategia:
  - Cada lote = 1 PATCH PostgREST com ativo=true filtrando por uma pagina de ids.
  - Como PostgREST nao tem LIMIT no UPDATE, paginamos buscando os ids primeiro
    (GET ... ativo=is.false&embedding=is.null&limit=LOTE) e damos PATCH por id IN (...).
  - Pausa entre lotes p/ o pg_net/Fluxo 10 processarem.

SEGURANCA: DRY-RUN por padrao. --executar para gravar. Cada lote commita sozinho;
seguro interromper (Ctrl+C) e retomar (sempre pega os que ainda faltam).

Uso:
  python -u ativar_produtos.py                 # DRY-RUN (so conta)
  python -u ativar_produtos.py --executar      # ativa em lotes
  python -u ativar_produtos.py --executar --lote 300 --pausa 15
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENV = "../.env.local"
LOTE = 300
PAUSA = 15.0


def carregar_env():
    url = key = None
    for line in open(ENV, encoding="utf-8", errors="replace"):
        line = line.strip()
        if line.startswith("NEXT_PUBLIC_SUPABASE_URL"):
            url = line.split("=", 1)[1].strip().strip('"').strip("'")
        if line.startswith("SUPABASE_SERVICE_ROLE_KEY"):
            key = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not url or not key:
        raise SystemExit("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY em " + ENV)
    return url.rstrip("/"), key


def http(method, url, key, body=None, extra_headers=None):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json", "Prefer": "return=minimal",
    }
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.status, r.read()


def get_json(url, key):
    req = urllib.request.Request(url, method="GET", headers={
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8"))


def contar_pendentes(url, key):
    # HEAD com Prefer count exact
    full = f"{url}/rest/v1/produtos?select=id&ativo=is.false&embedding=is.null"
    req = urllib.request.Request(full, method="HEAD", headers={
        "apikey": key, "Authorization": f"Bearer {key}",
        "Prefer": "count=exact", "Range-Unit": "items", "Range": "0-0",
    })
    with urllib.request.urlopen(req, timeout=60) as r:
        cr = r.headers.get("Content-Range", "")  # ex: 0-0/25800
    return int(cr.split("/")[-1]) if "/" in cr else None


def main():
    executar = "--executar" in sys.argv
    lote = LOTE
    pausa = PAUSA
    if "--lote" in sys.argv:
        lote = int(sys.argv[sys.argv.index("--lote") + 1])
    if "--pausa" in sys.argv:
        pausa = float(sys.argv[sys.argv.index("--pausa") + 1])

    url, key = carregar_env()
    pend = contar_pendentes(url, key)
    modo = "EXECUTAR" if executar else "DRY-RUN"
    print(f"=== MODO: {modo} | lote={lote} | pausa={pausa}s ===", flush=True)
    print(f"Produtos pendentes (ativo=false, sem embedding): {pend}", flush=True)
    est_lotes = (pend + lote - 1) // lote if pend else 0
    print(f"Estimativa: {est_lotes} lotes (~{est_lotes*pausa/60:.0f} min so de pausas)", flush=True)

    if not executar:
        print("\n*** DRY-RUN: nada ativado. Rode com --executar. ***", flush=True)
        return

    t0 = time.time()
    feitos = 0
    while True:
        # pega proxima pagina de ids pendentes
        sel = (f"{url}/rest/v1/produtos?select=id&ativo=is.false"
               f"&embedding=is.null&order=id&limit={lote}")
        ids = [r["id"] for r in get_json(sel, key)]
        if not ids:
            break
        # PATCH ativo=true filtrando por esses ids (in.(...))
        lista = ",".join(f'"{i}"' for i in ids)
        patch_url = f"{url}/rest/v1/produtos?id=in.({urllib.parse.quote(lista)})"
        http("PATCH", patch_url, key, {"ativo": True})
        feitos += len(ids)
        print(f"    ativados {feitos} (+{len(ids)}) | {time.time()-t0:.0f}s", flush=True)
        # pausa p/ o pg_net/Fluxo 10 drenarem
        time.sleep(pausa)

    print(f"\n=== CONCLUIDO: {feitos} produtos ativados em {time.time()-t0:.0f}s ===", flush=True)
    print("Os embeddings sao gerados de forma assincrona pelo Fluxo 10.", flush=True)


if __name__ == "__main__":
    main()
