# -*- coding: utf-8 -*-
"""
Tratamento da lista de produtos do ERP (Prime) -> CSV no padrao da tabela `produtos` do Supabase.

Padrao da tabela (zziapgnenvugyvrgrhrs):
  colunas: nome, preco_atual, unidade, categoria, nicho, descricao, tipo, ativo
  - categoria: conjunto FECHADO (minuscula)
  - nicho: SO acougue/churrasco/padaria quando aplicavel; senao vazio
  - descricao: frase descritiva com a MARCA junto ao descritivo do produto
  - nome: Title Case limpo, acentos corretos, sem EAN

A categoria + nicho + descricao sao gerados por IA (gpt-4o-mini) em lote.
preco_atual=0, unidade=UN, tipo=produto, ativo=true (xlsx nao tem preco).

Saida:
  produtos_tratado_v2.csv      -> prontos para importar (padrao do banco) + _codigo_erp/_ean no fim
  produtos_descartados_v2.csv  -> duplicados (por nome normalizado dentro do xlsx)
  produtos_ja_no_banco_v2.csv  -> nome ja existe nos 421 do banco

Uso:
  python tratar_produtos.py            # processa TUDO
  python tratar_produtos.py --limite 100   # so os N primeiros (amostra)
"""
import csv, json, os, re, sys, time, unicodedata
from concurrent.futures import ThreadPoolExecutor, as_completed

import openpyxl
from openai import OpenAI

# ----------------- config -----------------
XLSX = "relatorio de produtos para IA.xlsx"
NOMES_BANCO = "nomes_no_banco.txt"
OUT_OK = "produtos_tratado_v2.csv"
OUT_DESC = "produtos_descartados_v2.csv"
OUT_JABANCO = "produtos_ja_no_banco_v2.csv"
ENV = "../.env.local"

MODEL = "gpt-4o-mini"
BATCH = 20            # produtos por chamada (lote de 50 estourava 60s; ~1,4s/produto)
MAX_WORKERS = 15      # chamadas paralelas (I/O-bound)
REQ_TIMEOUT = 90      # timeout por request (lote de 20 leva ~30s, folga grande)

CATEGORIAS = ["mercearia","carnes","temperos","laticinios","outros","ofertas",
              "bebidas","padaria","higiene","limpeza","kits","congelados","pet"]
NICHOS = ["acougue","churrasco","padaria"]  # so estes; senao vazio

# ----------------- helpers -----------------
def carregar_chave():
    for line in open(ENV, encoding="utf-8", errors="replace"):
        line = line.strip()
        if line.startswith("OPENAI_API_KEY"):
            return line.split("=",1)[1].strip().strip('"').strip("'")
    raise SystemExit("OPENAI_API_KEY nao encontrada em " + ENV)

def fix_encoding(s):
    """O xlsx vem com acentos quebrados (cp1252 lido como utf-8 ou vice-versa)."""
    if not s:
        return ""
    s = str(s)
    # tenta recuperar mojibake comum
    if any(c in s for c in ("Ã","�","Â")):
        try:
            s2 = s.encode("cp1252", errors="replace").decode("utf-8", errors="replace")
            if s2.count("�") <= s.count("�"):
                s = s2
        except Exception:
            pass
    s = s.replace("�", "")
    return s

def norm_nome(s):
    """Title Case limpo, espacos normalizados."""
    s = fix_encoding(s).strip()
    s = re.sub(r"\s+", " ", s)
    # Title Case preservando palavras pequenas em minuscula
    minusc = {"de","da","do","das","dos","com","e","em","p/","s/","a","o","au"}
    palavras = s.lower().split(" ")
    out = []
    for i,p in enumerate(palavras):
        if i>0 and p in minusc:
            out.append(p)
        else:
            out.append(p[:1].upper()+p[1:] if p else p)
    return " ".join(out)

def chave_norm(s):
    """Chave de deduplicacao: lower, sem acento, alfanumerico."""
    s = fix_encoding(s).lower().strip()
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c)!="Mn")
    s = re.sub(r"[^a-z0-9]+"," ", s).strip()
    return s

def marca_util(m):
    m = fix_encoding(m).strip()
    if not m: return ""
    low = m.lower()
    if "sem marca cadastrada" in low:
        # as vezes vem "Sem Marca Cadastrada Tortuguita" -> lixo, descarta tudo
        return ""
    if low in ("sem marca","s/ marca","nao informada","n/d","---"):
        return ""
    return m

# ----------------- IA -----------------
SYS_PROMPT = f"""Voce trata produtos de um mercado/atacarejo brasileiro para um catalogo.
O nome vem do ERP, frequentemente ABREVIADO e mal formatado (ex: "Bisc Pac Man", "Choc Garoto Caju", "Ap.preb.bic", "Sand.hav.slim", "Refre.po").
Para CADA produto recebido (numero + nome_erp + marca opcional), responda com:
- "nome": o nome LIMPO e expandido, no padrao de catalogo. Expanda abreviacoes comuns
  (Bisc->Biscoito, Choc->Chocolate, Refri/Refr->Refrigerante, Ap.->Aparelho, Sand.->Sandalia,
   Hav.->Havaianas, Det.->Detergente, Sab.->Sabonete/Sabao conforme contexto, Marg.->Margarina,
   Cond.->Condicionador, Bat.->Batata, Choco->Chocolate, Leite Cond->Leite Condensado, etc.),
  corrija erros obvios de digitacao (Absovente->Absorvente), mantenha gramatura/volume (110g, 350ml, 600ml)
  e o nome da marca. Title Case natural. NAO invente informacao que nao esteja no nome/marca.
- "categoria": exatamente UMA destas (minuscula): {", ".join(CATEGORIAS)}
- "nicho": APENAS um destes quando claramente aplicavel: {", ".join(NICHOS)}. Caso contrario use "" (string vazia). A maioria dos produtos NAO tem nicho.
- "descricao": UMA frase curta e natural descrevendo o produto, SEMPRE INCLUINDO o nome da marca (a marca pode estar embutida no nome do ERP; identifique-a). Ex: "Macarrao instantaneo sabor galinha da marca Nissin, 85g." Se realmente nao houver marca identificavel, descreva sem inventar marca.
- "nao_alimento": true se o produto NAO for de mercado/alimenticio/consumo domestico (ex: calcados, chinelos, chip de celular, eletronicos, bazar, vestuario); senao false.

Regras de categoria:
- carnes: cortes bovinos/suinos/aves/peixes crus (acougue).
- mercearia: secos, enlatados, graos, massas, oleo, acucar, farinha, snacks, doces, biscoitos.
- temperos: especiarias, caldos, molhos, sal, condimentos.
- laticinios: leite, queijo, iogurte, manteiga, requeijao, creme de leite.
- bebidas: refrigerante, suco, agua, cerveja, vinho, energetico, cafe, cha.
- padaria: paes, bolos, roscas, salgados de padaria.
- higiene: cuidado pessoal, sabonete, shampoo, creme dental, absorvente, fralda.
- limpeza: detergente, sabao, desinfetante, amaciante, papel higienico.
- congelados: itens congelados (pizza, nugget, lasanha, batata congelada).
- pet: racao, petisco e itens de animais.
- kits: cestas/combos montados.
- ofertas: use so se claramente for uma oferta promocional.
- outros: quando nao se encaixar em nenhuma acima (utilidades, bazar, papelaria, pilhas, etc).

Responda SOMENTE com um array JSON, um objeto por produto, na MESMA ORDEM, no formato:
[{{"i": <numero>, "nome": "...", "categoria": "...", "nicho": "...", "descricao": "...", "nao_alimento": false}}]
Sem texto fora do JSON."""

def classificar_lote(client, lote):
    """lote = lista de dicts {i, nome, marca}. Retorna dict i -> {categoria,nicho,descricao}."""
    linhas = []
    for it in lote:
        marca = f" | marca: {it['marca']}" if it["marca"] else ""
        linhas.append(f"{it['i']}: {it['nome']}{marca}")
    user = "Produtos:\n" + "\n".join(linhas)
    for tentativa in range(4):
        try:
            resp = client.chat.completions.create(
                model=MODEL,
                temperature=0,
                response_format={"type":"json_object"},
                timeout=REQ_TIMEOUT,   # falha rapido em vez de pendurar o worker para sempre
                messages=[
                    {"role":"system","content":SYS_PROMPT + '\nEnvolva o array numa chave "itens".'},
                    {"role":"user","content":user},
                ],
            )
            data = json.loads(resp.choices[0].message.content)
            arr = data.get("itens") or data.get("produtos") or next((v for v in data.values() if isinstance(v,list)), [])
            out = {}
            for o in arr:
                i = o.get("i")
                cat = (o.get("categoria") or "outros").strip().lower()
                if cat not in CATEGORIAS: cat = "outros"
                nic = (o.get("nicho") or "").strip().lower()
                if nic not in NICHOS: nic = ""
                desc = (o.get("descricao") or "").strip()
                nome = (o.get("nome") or "").strip()
                nao_alim = bool(o.get("nao_alimento"))
                out[i] = {"nome":nome,"categoria":cat,"nicho":nic,"descricao":desc,"nao_alimento":nao_alim}
            return out
        except Exception as e:
            if tentativa == 3:
                print(f"  [ERRO lote apos retries]: {type(e).__name__}: {e}", flush=True)
                return {it["i"]:{"nome":it["nome"],"categoria":"outros","nicho":"","descricao":it["nome"],"nao_alimento":False} for it in lote}
            # backoff: rate-limit/conexao espera mais
            espera = 3*(tentativa+1)
            if "rate" in str(e).lower() or "429" in str(e): espera = 10*(tentativa+1)
            time.sleep(espera)

# ----------------- main -----------------
def main():
    limite = None
    if "--limite" in sys.argv:
        limite = int(sys.argv[sys.argv.index("--limite")+1])

    # nomes ja no banco
    banco = set()
    if os.path.exists(NOMES_BANCO):
        for line in open(NOMES_BANCO, encoding="utf-8"):
            n = line.strip()
            if n: banco.add(chave_norm(n))
    print(f"Nomes no banco carregados: {len(banco)}")

    # ler xlsx
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Plan1"]
    brutos = []
    for r in ws.iter_rows(min_row=5, values_only=True):
        if r[0] is None: continue
        brutos.append({
            "codigo_erp": r[0],
            "nome_raw": r[1],
            "ean": str(r[7] or "").strip(),
            "marca_raw": r[6],
        })
    wb.close()
    if limite: brutos = brutos[:limite]
    print(f"Produtos lidos do xlsx: {len(brutos)}")

    # normalizar, dedup interno, separar ja-no-banco
    vistos = set()
    ok = []          # entram na IA
    descartados = [] # dup interno
    ja_banco = []
    for b in brutos:
        nome = norm_nome(b["nome_raw"])
        if not nome:
            continue
        ck = chave_norm(nome)
        if ck in vistos:
            descartados.append({"codigo_erp":b["codigo_erp"],"nome":nome,"motivo":"dup_nome_no_xlsx"})
            continue
        vistos.add(ck)
        if ck in banco:
            ja_banco.append({"codigo_erp":b["codigo_erp"],"nome":nome})
            continue
        ok.append({
            "i": len(ok),
            "codigo_erp": b["codigo_erp"],
            "nome": nome,
            "ean": b["ean"],
            "marca": marca_util(b["marca_raw"]),
        })
    print(f"Para classificar: {len(ok)} | dup_xlsx: {len(descartados)} | ja_no_banco: {len(ja_banco)}")

    # classificar em lotes paralelos
    # timeout global por request + sem retry interno da lib (retry manual no loop)
    client = OpenAI(api_key=carregar_chave(), timeout=float(REQ_TIMEOUT), max_retries=0)
    lotes = [ok[x:x+BATCH] for x in range(0, len(ok), BATCH)]
    print(f"Lotes: {len(lotes)} de ate {BATCH} (workers={MAX_WORKERS})", flush=True)
    resultados = {}
    feitos = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
        futs = {ex.submit(classificar_lote, client, lote): li for li,lote in enumerate(lotes)}
        for fut in as_completed(futs):
            resultados.update(fut.result())
            feitos += 1
            if feitos % 5 == 0 or feitos == len(lotes):
                el = time.time()-t0
                taxa = feitos/el if el>0 else 0
                rest = (len(lotes)-feitos)/taxa if taxa>0 else 0
                print(f"  lotes {feitos}/{len(lotes)} | {el:.0f}s | ~{rest:.0f}s restantes", flush=True)

    # montar saida
    with open(OUT_OK, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["nome","preco_atual","unidade","categoria","nicho","descricao","tipo","ativo",
                    "_codigo_erp","_ean","_nome_erp","_revisar_nao_alimento"])
        for it in ok:
            cl = resultados.get(it["i"], {"nome":it["nome"],"categoria":"outros","nicho":"","descricao":it["nome"],"nao_alimento":False})
            nome_final = cl.get("nome") or it["nome"]   # nome limpo da IA, fallback ao normalizado
            w.writerow([nome_final, 0, "UN", cl["categoria"], cl["nicho"], cl["descricao"],
                        "produto", "true", it["codigo_erp"], it["ean"], it["nome"],
                        "sim" if cl.get("nao_alimento") else ""])

    with open(OUT_DESC, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["codigo_erp","nome","motivo"])
        for d in descartados: w.writerow([d["codigo_erp"],d["nome"],d["motivo"]])

    with open(OUT_JABANCO, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f); w.writerow(["codigo_erp","nome"])
        for d in ja_banco: w.writerow([d["codigo_erp"],d["nome"]])

    print(f"\nOK -> {OUT_OK} ({len(ok)} linhas)")
    print(f"Descartados -> {OUT_DESC} ({len(descartados)})")
    print(f"Ja no banco -> {OUT_JABANCO} ({len(ja_banco)})")

if __name__ == "__main__":
    main()
