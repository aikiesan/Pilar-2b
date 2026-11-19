# Na Unicamp: diagnóstico do servidor e troca de repositório

Roteiro para seguir de um computador da Unicamp, conectado ao servidor do NIPE
por SSH. Não precisa de nada desta máquina: tudo vem do GitHub.

O objetivo da visita, em ordem:

1. **Diagnóstico** (só leitura, ~2 min) — obrigatório.
2. **Trazer a saída** para analisar.
3. **Troca para o repositório novo** — só depois da análise, ou na hora se o
   diagnóstico apontar o Next vulnerável e der para fazer com calma.

---

## Antes de sair de casa

Os branches de trabalho precisam estar no GitHub: commitar o que estiver
pendente em cada worktree (`git -C <pasta> status` mostra) e depois:

```sh
git -C /a/Pilar-2b-servidor push -u origin servidor/diagnostico-e-troca-de-repo
git -C /a/Pilar-2b-feijoada  push -u origin feijoada/mapa-busca-destaca
git -C /a/Pilar-2b-limpo     push -u origin empada/explore-portas
git -C /a/Pilar-2b-limpo     push -u origin dobradinha/bivariado-cliente
```

O primeiro é o que importa para a visita: é dele que o servidor baixa o script.

---

## 1. Conectar

Num terminal do computador da Unicamp (no Windows, o PowerShell já tem `ssh`):

```sh
ssh lucas@177.220.121.2 -p 22004
```

## 2. Rodar o diagnóstico

Já dentro do servidor:

```bash
curl -fsSL https://raw.githubusercontent.com/aikiesan/Pilar-2b/servidor/diagnostico-e-troca-de-repo/cp2b-workspace/NewLook/scripts/vm_diagnostico.sh -o /tmp/vm_diagnostico.sh
bash /tmp/vm_diagnostico.sh
```

(Depois que o branch entrar no `main`, troque `servidor/diagnostico-e-troca-de-repo`
por `main` na URL.)

Ele só lê: não reinicia, não instala, não faz `git pull`. Termina dizendo onde
salvou a saída: `/tmp/pilar2b-diagnostico-<data>.txt`.

Se o servidor não alcançar o GitHub (rede da Unicamp), copie o script pelo
computador local: abra a URL acima no navegador, salve como `vm_diagnostico.sh`
e mande com `scp -P 22004 vm_diagnostico.sh lucas@177.220.121.2:/tmp/`.

## 3. Trazer a saída

Do computador da Unicamp, **fora** do SSH (abra outro terminal):

```sh
scp -P 22004 "lucas@177.220.121.2:/tmp/pilar2b-diagnostico-*.txt" .
```

Leve o arquivo (e-mail para você mesmo, pendrive) e cole na conversa com o
Claude. **Não publique** em issue nem em PR: o repositório é público, e a saída
descreve o servidor (caminhos, versões, portas). Segredos não aparecem nela,
mas o resto também não precisa ser público.

## 4. O que olhar na hora

Se quiser decidir ali mesmo, estas linhas da saída respondem as perguntas da
`RETOMAR`:

| Linha | O que decide |
|---|---|
| `next, NO AR (.next/standalone)` | **16.4.0 a 16.4.5 = falha de segurança grave no ar.** A troca vira hotfix. |
| `remotos` | Confirma que o checkout ainda aponta para o repositório antigo. |
| `municípios` e `infraestrutura por camada` | Se o banco de produção tem a base nacional (correção 3 do plano do `/explore`). |
| `migrações do repositório ainda não aplicadas` | Se a troca precisa do passo de banco (backup + migração). |
| `JSON comprimido pelo Apache` | Se o `mod_deflate` comprime a API. |
| `SECRET_KEY … sha256` | Compare com o sha256 da chave antiga do Railway: iguais = trocar a chave. |
| `Máquina → disco` | A troca precisa de ~3 GB livres em `/var/www`. |

## 5. A troca (só com o diagnóstico analisado)

O roteiro completo, com o porquê de cada passo e como voltar atrás:
[`TROCA_DE_REPOSITORIO.md`](TROCA_DE_REPOSITORIO.md).

Em resumo: clonar o repositório novo ao lado do antigo, copiar o que o git não
carrega (`.env`, `.env.local`, `data/raw`, `.venv`, o build no ar), trocar as
pastas de nome, reiniciar o backend e rodar `frontend/deploy.sh --no-pull`.
O site fica no ar o tempo todo, e voltar é renomear as pastas de volta.

Não fazer a troca com pressa: reserve uma hora, e não numa sexta à tarde.

## 6. Ao sair

```bash
exit            # sai do SSH
```

Nada mais a desfazer: o diagnóstico só gravou o arquivo em `/tmp` do servidor.
