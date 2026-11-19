# Troca do checkout do servidor para o repositório novo

O checkout de produção (`/var/www/pilar2b/repo`) ainda aponta para o repositório
antigo, hoje `aikiesan/Pilar-2b-arquivo` (privado, com chaves vazadas no
histórico). O repositório novo, `aikiesan/Pilar-2b` (público), começou do zero
em 18/11/2026: as duas histórias não têm commit em comum, então `git pull` e o
`frontend/deploy.sh` (que faz `git merge --ff-only`) recusam a atualização.

A troca é feita **lado a lado**: um clone novo ao lado do antigo, montado com o
que o git não carrega, e as duas pastas trocam de nome num instante. Os caminhos
que o PM2 e o Apache usam (`/var/www/pilar2b/repo/...`) não mudam, então nenhuma
configuração deles é tocada. O checkout antigo fica intacto ao lado, e voltar é
renomear de novo.

Leva uns 30–40 minutos, quase tudo antes da troca; o site fica no ar o tempo
todo, e o backend reinicia uma vez (segundos).

---

## 0. Antes: o diagnóstico

Da sua máquina, levar o script (o checkout do servidor ainda é o antigo e não o tem):

```bash
scp -P 22004 cp2b-workspace/NewLook/scripts/vm_diagnostico.sh lucas@177.220.121.2:/tmp/
```

No servidor:

```bash
ssh lucas@177.220.121.2 -p 22004
bash /tmp/vm_diagnostico.sh
```

Depois de o script estar no `main`, também dá para buscá-lo direto no servidor:
`curl -fsSL https://raw.githubusercontent.com/aikiesan/Pilar-2b/main/cp2b-workspace/NewLook/scripts/vm_diagnostico.sh -o /tmp/vm_diagnostico.sh`.

Só lê. Grava a saída em `/tmp/pilar2b-diagnostico-<data>.txt`; esse arquivo
volta para a análise antes de seguir. Ele responde o que este roteiro precisa:

| Pergunta | Onde no diagnóstico | Muda o quê |
|---|---|---|
| O Next no ar é anterior à 16.4.6? | Versões → `next, NO AR` | Se for, a troca vira hotfix e não espera segunda |
| Que arquivos fora do git existem? | Fora do git | O que copiar no passo 2 |
| Faltam migrações? | Banco → não aplicadas | Se faltam, o passo 4 (backup + migração) entra |
| O `requirements.txt` mudou? | Versões → diferenças | Se mudou, o `pip install` do passo 5 entra |
| Cabe? | Máquina → disco | Precisa de ~3 GB livres em `/var/www` |

## 1. Clonar ao lado

```bash
cd /var/www/pilar2b
git clone https://github.com/aikiesan/Pilar-2b.git repo-novo
git -C repo-novo log --oneline -1    # o commit que vai para o ar
```

## 2. Trazer o que o git não carrega

Tudo copiado do checkout antigo, que segue rodando.

```bash
OLD=/var/www/pilar2b/repo/cp2b-workspace/NewLook
NEW=/var/www/pilar2b/repo-novo/cp2b-workspace/NewLook

# Configuração (segredos): nunca vêm do git.
cp -p "$OLD/backend/.env"        "$NEW/backend/.env"
cp -p "$OLD/frontend/.env.local" "$NEW/frontend/.env.local"
[ -f "$OLD/frontend/.env.production" ] && cp -p "$OLD/frontend/.env.production" "$NEW/frontend/"

# Dados brutos que os scripts de carga leem (gitignored).
rsync -a "$OLD/backend/data/raw/" "$NEW/backend/data/raw/"

# O ambiente Python. Copiado, não recriado: os executáveis de um venv guardam o
# caminho absoluto do python dele, e o desta cópia (…/repo/…) passa a valer
# justamente depois da troca de nomes. Um venv criado em repo-novo apontaria
# para …/repo-novo/… e o uvicorn não subiria depois da troca.
cp -a "$OLD/backend/.venv" "$NEW/backend/.venv"

# O build que está no ar, para a troca não mudar o site: logo depois dela o
# site serve exatamente o mesmo frontend de antes. O build novo vem no passo 6.
cp -a "$OLD/frontend/.next" "$NEW/frontend/.next"
```

Se o diagnóstico listou outros arquivos ignorados que importam (em "outros
arquivos ignorados"), copie-os também.

## 3. Conferir antes de trocar

```bash
diff <(cd "$OLD" && ls -a backend frontend) <(cd "$NEW" && ls -a backend frontend)
grep -c . "$NEW/backend/.env" "$NEW/frontend/.env.local"
```

As diferenças devem ser só arquivos que o repositório novo acrescentou ou tirou.

## 4. Banco: backup e migrações (só se o diagnóstico listou migrações faltando)

```bash
# Só a linha do banco: carregar o .env inteiro com `.` quebra em senhas com # ou $.
DATABASE_URL="$(grep '^DATABASE_URL=' "$OLD/backend/.env" | tail -1 | cut -d= -f2- | tr -d "\"'")"
pg_dump -Fc "$DATABASE_URL" -f ~/pilar2b-antes-da-troca-$(date +%F).dump
ls -lh ~/pilar2b-antes-da-troca-*.dump

cd "$NEW/backend"
# Explícito: sem DATABASE_URL no ambiente, o script cai num padrão de desenvolvimento.
DATABASE_URL="$DATABASE_URL" .venv/bin/python scripts/run_migrations.py      # sem --seed
```

As migrações são aditivas e o código antigo convive com elas; por isso rodam
antes da troca, com o site ainda no checkout antigo.

## 5. A troca

```bash
cd /var/www/pilar2b
mv repo "repo-arquivo-$(date +%F)"
mv repo-novo repo

cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/backend
# Só se o diagnóstico mostrou diferenças entre requirements.txt e o .venv:
.venv/bin/pip install -r requirements.txt

pm2 restart pilar-backend --update-env     # por nome; nunca reload do ecosystem
curl -s http://127.0.0.1:8001/health
```

O `pilar-frontend` não precisa reiniciar aqui: ele serve o mesmo build de antes,
agora lido da pasta nova.

## 6. O frontend novo

```bash
cd /var/www/pilar2b/repo/cp2b-workspace/NewLook/frontend
./deploy.sh --no-pull
```

O `deploy.sh` constrói fora do lugar, testa numa porta de reserva, troca o
`.next` com um `mv` e reinicia o `pilar-frontend`; se a checagem depois da
troca falhar, ele mesmo devolve o build anterior. `--no-pull` porque o clone
acabou de ser feito; das próximas vezes, `./deploy.sh` puxa do repositório novo.

## 7. Verificar

```bash
/var/www/pilar2b/repo/cp2b-workspace/NewLook/scripts/vm_verify.sh
```

E no navegador: `https://cp2b.unicamp.br/pilar2b/pt-BR`, o mapa, um perfil de
município.

---

## Voltar atrás

Até o passo 5, nada no ar mudou: basta apagar `repo-novo`.

Depois do passo 5:

```bash
cd /var/www/pilar2b
mv repo repo-novo-falhou
mv repo-arquivo-<data> repo
pm2 restart pilar-backend pilar-frontend --update-env
```

O banco só volta se o passo 4 rodou e as migrações forem o problema:
`pg_restore --clean -d "$DATABASE_URL" ~/pilar2b-antes-da-troca-<data>.dump`.

Só o frontend novo com problema (depois do passo 6): `./deploy.sh --rollback`.

## Depois

- Manter `repo-arquivo-<data>` por duas semanas e então apagá-lo: o `.git` dele
  carrega o histórico com as chaves vazadas.
- As chaves que vazaram no histórico antigo continuam valendo até serem
  trocadas. O diagnóstico mostra 12 caracteres do sha256 do `SECRET_KEY` atual
  para comparar com o da chave antiga sem expor nenhuma das duas.
