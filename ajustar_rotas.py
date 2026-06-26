"""
Script: ajustar_rotas.py
Substitui a URL base da API nos arquivos da pasta public/.
Idempotente — rodar mais de uma vez nao quebra nada.
Uso:  python ajustar_rotas.py
"""

import os
import re

# ========================================================
# CONFIGURE AQUI sua URL do backend
# ========================================================
BACKEND_URL = "https://sst-gestao-1.onrender.com"
# ========================================================

PASTA = "public"
EXTENSOES = {".html", ".js", ".css"}


def ajustar_const_api(conteudo: str) -> tuple:
    """
    Substitui 'const API = '';' ou 'const API = '<qualquer coisa>';'
    pela URL configurada.  So atua na declaracao da constante.
    Ex: const API = '';  ->  const API = 'https://...';
    """
    # Se ja esta com a URL correta, nao mexe
    if f"const API = '{BACKEND_URL}';" in conteudo:
        return conteudo, 0
    if f'const API = "{BACKEND_URL}";' in conteudo:
        return conteudo, 0

    padrao = re.compile(
        r"(\bconst\s+API\s*=\s*)['\"][^'\"]*['\"]\s*;"
    )
    novo_conteudo, n = padrao.subn(
        rf"\1'{BACKEND_URL}';", conteudo
    )
    return novo_conteudo, n


def ajustar_fetch_relativo(conteudo: str) -> tuple:
    """
    Corrige fetch(url, ...) que usa URL relativa sem o prefixo API.
    Isso acontece em funcoes como downloadAuth que fazem fetch direto.
    Ex: fetch(url, { headers })  ->  fetch(API + url, { headers })
         (apenas quando 'url' nao tiver 'API +' antes)
    """
    # Captura fetch(  VARIAVEL  , ...) onde a variavel nao tem prefixo API +
    padrao = re.compile(
        r"(\bfetch\()(?!\s*API\s*\+)(\s*)(url)(\s*[,)])"
    )
    novo_conteudo, n = padrao.subn(
        r"\1\2API + \3\4", conteudo
    )
    return novo_conteudo, n


def ajustar_arquivo(caminho: str) -> int:
    """Processa um arquivo. Retorna numero de substituicoes feitas."""
    with open(caminho, "r", encoding="utf-8") as f:
        original = f.read()

    conteudo = original
    total = 0

    # 1. Ajusta a constante API
    conteudo, n1 = ajustar_const_api(conteudo)
    total += n1

    # 2. Ajusta fetch(url, ...) que esqueceram de prefixar com API +
    conteudo, n2 = ajustar_fetch_relativo(conteudo)
    total += n2

    if conteudo != original:
        with open(caminho, "w", encoding="utf-8") as f:
            f.write(conteudo)
        print(f"  [OK] {caminho} — {total} ajuste(s)")

    return total


def main():
    if not os.path.isdir(PASTA):
        print(f"[ERRO] Pasta '{PASTA}' nao encontrada. Rode o script na raiz do projeto.")
        return

    print(f"[SCAN] Varrendo '{PASTA}/' em busca de rotas relativas...")
    print(f"[TARGET] Backend: {BACKEND_URL}")
    print()

    total_arquivos = 0
    total_subs = 0

    for raiz, _, arquivos in os.walk(PASTA):
        for nome in arquivos:
            ext = os.path.splitext(nome)[1].lower()
            if ext not in EXTENSOES:
                continue
            caminho = os.path.join(raiz, nome)
            subs = ajustar_arquivo(caminho)
            if subs:
                total_arquivos += 1
                total_subs += subs

    print()
    print(f"[SUMMARY] {total_subs} ajustes em {total_arquivos} arquivo(s).")
    if total_subs == 0:
        print("   (tudo ja estava ajustado — nada a fazer)")
    else:
        print("[DONE] Pronto! Faca o deploy dos arquivos atualizados na Vercel.")


if __name__ == "__main__":
    main()
