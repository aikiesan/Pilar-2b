# Login com aprovação e análises restritas: design

Data: 22/11/2026. Status: rascunho para aprovação do Lucas.

## Intenção e porquê

O PILAR-2b vai receber muitas análises, metodologias de mapeamento e formas de interação com o WebGIS. Esse trabalho é o diferencial do grupo e não deve circular solto nem ser baixado inteiro. Os dados brutos de potencial e biomassa já são públicos no REDU da Unicamp (doi:10.25824/REDU/F36WP9), então mostrar esses dados no mapa não expõe nada novo.

Por isso a plataforma passa a ter dois níveis:

- **Público, sem login:** um mapa de visualização de São Paulo com o potencial de biogás por município e as camadas do mapa.
- **Com login aprovado:** as análises bivariadas, as perguntas com respostas (as portas do `/explore` e da home) e todas as análises futuras.

Na primeira fase, o Lucas revê manualmente todo pedido de acesso: ele recebe um aviso por e-mail, decide num painel e a pessoa recebe por e-mail o link para entrar. As regras de aprovação automática (domínios de universidades, instituições) vêm numa fase 2, fora deste design.

## Objetivos

1. Esconder as análises do público já, com uma chave de configuração, para que o PR 1 (mapa), o #32 (explore) e o PR 2 (home) entrem no `main` sem publicar as análises.
2. Cadastro aberto, em que cada conta nasce pendente. A pessoa confirma o e-mail e o pedido vai para a fila do Lucas.
3. Aviso por e-mail ao Lucas a cada pedido novo, já com o e-mail confirmado.
4. Painel de admin no site para aprovar, recusar (com motivo opcional), desativar e ver contas.
5. E-mails para quem pediu acesso: confirmação de endereço, conta liberada com o link de login, pedido recusado e redefinição de senha.
6. Análises e dados não públicos servidos só a quem tem login aprovado, conferindo no servidor e não apenas escondendo na tela.
7. Sessão que não derruba quem está trabalhando no mapa.

## Fora deste design (não objetivos)

- Regras de aprovação automática (fase 2). O banco já guarda quem decidiu, e quando, para que a fase 2 só passe a preencher essa decisão sozinha.
- Calcular as análises no servidor. Nesta fase elas continuam sendo calculadas no navegador (veja Riscos).
- Login por Google ou por e-mail sem senha.
- Exportar análises, para qualquer pessoa. Os downloads de dados continuam sob `DATA_EXPORT_ENABLED`.

## Seria um fracasso mesmo funcionando se

- o mapa público de potencial ficasse atrás de login ou mais lento;
- alguma análise continuasse acessível por um endpoint ou link aberto;
- os e-mails caíssem no spam ou nem saíssem, e o Lucas não soubesse dos pedidos;
- o Lucas precisasse de SSH ou SQL para aprovar alguém;
- quem foi aprovado fosse derrubado da sessão no meio do trabalho.

## Restrições

- Produção: VM Debian da Unicamp, Apache servindo em `https://cp2b.unicamp.br/pilar2b`. O frontend é Next.js standalone na porta 3002 e o backend é FastAPI na 8001, os dois via pm2. O TLS termina no proxy da Unicamp.
- O backend é Python/FastAPI e o banco é PostgreSQL 18. As migrations são SQL numeradas em `backend/app/migrations/`, e a próxima é a `040`.
- O login atual (veja Estado atual) é a base: nada de trocar de sistema.
- Só o Lucas faz commit. Os commits seguem Conventional Commits em inglês (CONTRIBUTING.md).
- LGPD: coletar só o necessário, dizer para quê e permitir apagar a conta (o `DELETE /auth/users/{id}` já existe).
- Design do frontend claro e sem cara de gerado (memória de design do projeto). Sem modo escuro.
- Escopo geográfico das análises: SP e o piloto de MG.

## Estado atual (levantado em 22/11)

- **Login no backend:** JWT HS256 em `Authorization: Bearer`, válido por 30 minutos e sem refresh. Logout põe o `jti` numa denylist. Senha em bcrypt, bloqueio após 5 tentativas e login limitado a 3 por minuto.
  - Papéis: `visitante`, `autenticado`, `interno` e `admin`, mais `clearance` de 0 a 2.
  - Dependências prontas: `get_current_user`, `require_authenticated`, `require_admin` e `optional_auth` (`backend/app/middleware/auth.py`).
- **Tabela `auth_users`** (migration 020): `is_active` é o único liga/desliga. Não há status, e-mail confirmado nem instituição.
- **Cadastro:** só o admin cria contas (`POST /auth/users`). Não há cadastro aberto, e o primeiro admin vem de `backend/scripts/seed_admin.py`.
- **E-mail:** o PILAR não envia nenhum.
- **Painel de admin:** não existe.
- **Frontend:**
  - O token fica no `localStorage` (`pilar2b-auth-token`).
  - Produção roda em "modo aberto" (`NEXT_PUBLIC_DISABLE_AUTH=true`), em que todo visitante vira um usuário interno sintético. Por isso os redirecionamentos de `/settings`, `/analysis`, `/proximity` e `/dashboard` nunca disparam.
  - `useRealSession` e `useBetaAccess` (`lib/betaAccess.ts`) contam "tem token salvo" como logado.
- **Dados do mapa:** quase tudo vem da API (`/municipalities/geojson`, `/geospatial…`, `/siting-indicators`, `/codigestion/…`, tiles MapBiomas). O único arquivo estático é `public/data/br_intermediary_regions.geojson`.
- **Análises (PR 1):** são calculadas no navegador (`lib/mapAnalyses.ts`, `lib/bivariate.ts`), a partir das feições que o mapa já tem e de `/siting-indicators`. Abrem pelo menu temático ou por `/map?a=<id>`. A home do PR 2 e o `/explore` do #32 apontam para esses links.

### Envio de e-mail (levantado na VM em 22/11)

- A VM não tem servidor de e-mail próprio, mas consegue abrir conexão de saída para `smtp.gmail.com:587/465` e `smtp.unicamp.br:587`.
- O e-mail da Unicamp é Google Workspace: os servidores de entrada são do Google e o SPF de `unicamp.br` inclui `_spf.google.com`.
- O site CP2B, na mesma VM, já envia com `nodemailer` por `smtp.gmail.com:587` como `forucp2b@unicamp.br`.

## Abordagens consideradas

| | Abordagem | Contra | Escolha |
|---|---|---|---|
| A | Ampliar o login que já existe no backend | Mais código próprio para manter | **Escolhida** |
| B | Serviço pronto (Clerk, Auth0, Keycloak) | Clerk e Auth0 guardam dados fora do Brasil (LGPD). Keycloak é mais um servidor na VM, e o backend teria que aceitar outro token | Descartada |
| C | Login no Next.js (Auth.js) | Duplica o backend, que continuaria tendo de conferir cada pedido | Descartada |

O Lucas escolheu A porque a tabela, os tokens, os papéis, o limite de tentativas e os endpoints de admin já existem. Falta o fluxo de pedido e aprovação em volta.

Para o e-mail, o Lucas escolheu o SMTP do Google com a conta `forucp2b@unicamp.br`, por `smtp.gmail.com:587` (STARTTLS) com senha de app. Os avisos de pedido novo vão para a conta institucional do Lucas. Remetente, conta e destino ficam no `.env`, não no código, e o destino não fica escrito no repositório. Trocar depois para uma conta `pilar2b@unicamp.br` é só mudar o `.env`.

## Design

### Parte 1: chave que esconde as análises (antes dos commits do PR 1, #32 e PR 2)

- Nova chave em `frontend/src/lib/featureFlags.ts`: `MAP_ANALYSES_ENABLED`, seguindo o padrão de `METHOD_PAGES_ENABLED`, com valor `false`.
- Com a chave em `false`:
  - O menu temático não mostra as análises.
  - O mapa ignora `?a=` e o tira da URL.
  - A legenda bivariada não aparece.
  - O mapa não chama `/siting-indicators`.
  - A seção das quatro perguntas da home (PR 2) some.
  - O `/explore` responde 404, como as páginas de método.
  - Nenhum menu, rodapé ou sitemap aponta para eles.
- O código das análises entra no `main`, mas fica inerte em produção.
- A proximidade e as camadas de codigestão não mudam na Parte 1. As camadas de codigestão já só aparecem com token salvo (`useBetaAccess`). A proximidade continua aberta até a Parte 2, como está hoje.
- Cada um dos três PRs leva a parte da chave que lhe cabe: o PR 1 cria a chave e protege o mapa, o #32 protege o `/explore`, e o PR 2 protege a seção da home.
- Na Parte 2, a regra passa a ser `MAP_ANALYSES_ENABLED && sessão aprovada`. A chave continua existindo como um "desliga tudo" de emergência.

### Parte 2: contas com aprovação

#### Estados da conta

Coluna nova `status` em `auth_users`:

```
pending_email  ──(clica no link do e-mail)──▶  pending_review  ──(Lucas aprova)──▶  approved
                                                      │
                                                      └──(Lucas recusa)──▶  rejected
```

- As contas que já existem ficam como `approved`.
- O `is_active` continua servindo para desativar uma conta aprovada sem apagá-la.
- Só `approved` + `is_active` consegue fazer login.
- Nos outros estados, o login responde com um código próprio (`email_not_verified`, `pending_review`, `rejected`), e a tela mostra a mensagem certa: "confirme seu e-mail (reenviar)", "seu pedido está em análise" ou "seu pedido não foi aprovado".

#### Banco (migration `040_auth_access_requests.sql`)

- `auth_users` ganha:
  - `status` (TEXT com CHECK nos quatro valores, default `pending_email`; as linhas existentes recebem `approved`);
  - `email_verified_at`;
  - `institution` (TEXT);
  - `purpose` (TEXT, até cerca de 500 caracteres);
  - `reviewed_by` (FK para `auth_users`), `reviewed_at` e `review_note`.
- Tabela nova `auth_email_tokens`:
  - colunas `id`, `user_id`, `kind` (`verify_email` | `reset_password`), `token_hash` (sha256, nunca o token puro), `expires_at`, `used_at` e `created_at`;
  - os tokens são de uso único;
  - a confirmação de e-mail vale 48 h e a redefinição de senha vale 1 h.
- Índice em `auth_users(status, created_at)` para a fila do painel.
- O `role` padrão de quem se cadastra continua `autenticado`.

#### Endpoints novos no backend (`/api/v1/auth`)

| Método e caminho | Quem | O que faz |
|---|---|---|
| `POST /signup` | público, limitado (ex.: 3/min por IP) | Cria a conta com `pending_email` e envia o e-mail de confirmação. Recebe nome, e-mail, senha, instituição, finalidade e aceite dos termos. Tem um campo-isca invisível contra robôs. Se o e-mail já existe, responde igual ao caso novo, para não revelar quais contas existem. |
| `POST /verify-email` | público | Recebe o token, marca `email_verified_at`, passa para `pending_review` e avisa o Lucas. |
| `POST /verify-email/resend` | público, limitado | Reenvia a confirmação para quem ainda está em `pending_email`. |
| `POST /password/forgot` | público, limitado | Envia o link de redefinição. A resposta é a mesma se o e-mail não existir. |
| `POST /password/reset` | público | Recebe o token e a senha nova. |
| `GET /admin/requests?status=` | admin | A fila do painel, com paginação. |
| `POST /admin/requests/{id}/approve` | admin | Passa para `approved`, grava quem aprovou e quando, e envia "conta liberada". |
| `POST /admin/requests/{id}/reject` | admin | Recebe um motivo opcional, passa para `rejected` e envia o e-mail de recusa (com o motivo, se houver). |

Os endpoints que já existem (`PATCH /users/{id}/active` e `DELETE /users/{id}`) atendem desativar e apagar.

#### E-mail

- Novo `backend/app/services/mailer.py`, com o `smtplib` da biblioteca padrão e STARTTLS, sem dependência nova.
- Variáveis de ambiente:
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM` (ex.: `PILAR-2b <forucp2b@unicamp.br>`);
  - `ADMIN_NOTIFY_EMAIL`;
  - `PUBLIC_SITE_URL` (`https://cp2b.unicamp.br/pilar2b`), para montar os links.
- O envio roda fora da resposta (`BackgroundTasks`). Uma falha é registrada no log e não derruba o cadastro.
- Sem SMTP configurado (desenvolvimento e testes), o mailer escreve o e-mail no log em vez de enviar.
- Cada mensagem tem texto puro e um HTML simples, com nome e instituição escapados.
- As mensagens são:
  - a confirmação de e-mail;
  - o aviso ao Lucas, com nome, e-mail, instituição, finalidade e o link direto para o painel;
  - a conta liberada, com o link de login;
  - a recusa;
  - a redefinição de senha.
- Os textos são em português. Inglês fica para depois.

#### Sessão

- A validade do token passa de 30 minutos para 7 dias (`ACCESS_TOKEN_EXPIRE_MINUTES=10080`). Isso é decisão minha (veja a seção "Decisões que tomei").
- O logout continua revogando o token pela denylist.
- Desativar ou recusar uma conta passa a valer no pedido seguinte: `get_current_user` confere `status` e `is_active` no banco a cada pedido. Hoje ele já consulta a denylist a cada pedido.

#### O que fica protegido no servidor

Decidido pelo Lucas em 22/11: as análises bivariadas, a proximidade e as camadas de codigestão vão para trás do login.

- Passam a exigir login aprovado:
  - `GET /municipalities/siting-indicators`;
  - todo o `/codigestion/*`: `clusters`, `residue-cn-matrix`, `municipality-typology` e `municipality-cn-profiles` (este último hoje usa `get_current_user`, que passa a exigir aprovação);
  - todo o `/proximity/*`;
  - todo endpoint novo de análise. A regra para o futuro é que análise nasce protegida.
- `require_authenticated` passa a exigir também `status = approved`.
- Ficam públicos: `/municipalities/geojson` (potencial por município), o perfil do município, as camadas de potencial, a infraestrutura e os tiles, que são os dados que já estão no REDU. Também ficam públicos o painel do mandato, o financiamento, a comparação e a calculadora (GEE).
- Os endpoints `/analysis/*` e `/scientific/kinetics` seguem as páginas de método, que já respondem 404 enquanto `METHOD_PAGES_ENABLED` estiver desligada. O builder confere se algum desses endpoints alimenta uma página pública. Se nenhum alimentar, eles também passam a exigir login.
- MG continua no mapa público junto com SP, porque o escopo SP+MG já é o que a API serve hoje (`MAP_ENABLED_UF_PREFIXES="35,31"`). Assim o geojson e o cache dele não mudam. Decisão minha.

#### Frontend

- **`/register`** vira "Pedir acesso". Campos: nome, e-mail, senha (mínimo 10 caracteres), instituição, "para que vai usar" e aceite dos termos e do aviso de privacidade. Depois de enviar, a tela diz "enviamos um link para seu e-mail".
- **`/verify-email?token=`** confirma o e-mail e mostra "seu pedido foi para análise; você receberá um e-mail quando for liberado".
- **`/login`** mostra a mensagem certa para cada estado da conta, com um link "esqueci a senha".
- **Duas páginas novas, `/forgot-password` e `/reset-password?token=`**, para o fluxo de redefinição de senha.
- **`/admin/acessos`** é o painel, só para admin:
  - abas Pendentes, Aprovados, Recusados e Usuários;
  - cada pedido mostra nome, e-mail, instituição, finalidade e data, com os botões Aprovar e Recusar (este com motivo opcional);
  - a aba Usuários mostra último acesso e papel, com a opção Desativar;
  - o contador de pendentes também aparece no menu do admin.
- **Mapa** com a chave ligada e sessão aprovada: as análises aparecem. Sem login, o menu mostra no lugar delas uma chamada curta "Análises disponíveis com login → Pedir acesso".
- **Camadas de codigestão e tipologia no painel do mapa** (`CodigestionClusterLayer`, `CodigestionDetailPanel`, `TypologyChoroLayer`) só aparecem com sessão aprovada. Sem login, o lugar delas no painel mostra a mesma chamada "disponível com login → Pedir acesso".
- **`/proximity`** exige sessão aprovada. Sem ela, a página leva a `/login?next=/proximity`. Os links para a proximidade (menu, perfil do município, dashboard) continuam visíveis e caem no login.
- **`useRealSession`** passa a conferir a sessão em `/auth/me` em vez de confiar só no token salvo.
- **Produção** muda para `NEXT_PUBLIC_DISABLE_AUTH=false`, e o modo aberto sai do caminho de produção. Antes disso é preciso conferir, página por página, o que deve continuar público (veja "Para o builder").

### Fase 2 (só registrada, não entra agora)

Uma tabela de regras de aprovação automática (padrões de domínio ou listas de universidades), consultada no `verify-email`: se o e-mail bate com uma regra, a conta vai direto para `approved`, com `reviewed_by = null` e uma nota dizendo qual regra aprovou. Contexto: as grandes universidades brasileiras usam `usp.br`, `unicamp.br` e `ufmg.br`, e não `.edu.br`, por isso a regra precisará de uma lista e não só de um sufixo.

## Riscos e limites

- **O que aparece na tela pode ser copiado.** As análises são calculadas no navegador, e o código que as calcula vai no JavaScript do site, que qualquer um baixa. O login protege os dados não públicos e esconde a interface; não protege o método contra quem ler o código. Para proteger o método de verdade seria preciso calcular as análises no servidor, o que fica para uma etapa futura, se for preciso.
- **Token no `localStorage`.** Um XSS roubaria a sessão. O site não renderiza HTML de usuários, e a sessão de 7 dias aumenta a janela. Migrar para cookie httpOnly é melhoria futura.
- **Senha de app do Google.** Exige verificação em duas etapas na conta `forucp2b`, e o Workspace da Unicamp precisa permitir senhas de app. O CP2B usar esse esquema sugere que estão liberadas. O limite de envio diário é dividido com o CP2B.
- **Ligar o login muda páginas que hoje dependem do modo aberto** (`/analysis`, `/proximity`, `/settings` e `/dashboard`).

## Decisões que tomei (o Lucas pode mudar)

- Confirmar o e-mail antes de o pedido ir para a fila: evita pedidos com e-mail de outra pessoa.
- Campo "para que vai usar" no cadastro: dá ao Lucas o que precisa para decidir.
- Motivo opcional na recusa, enviado no e-mail.
- Sessão de 7 dias.
- "Esqueci a senha" incluído: com e-mail funcionando, é barato, e sem ele cada senha esquecida vira trabalho manual do Lucas.
- `/explore` com 404 enquanto a chave estiver desligada.
- Resposta igual no cadastro e no "esqueci a senha" quando o e-mail já existe.
- Textos só em português nesta fase.
- Recusa reversível: na aba Recusados, o Lucas pode aprovar depois (`rejected → approved`, pelo mesmo `approve`). Uma conta recusada não se recadastra sozinha; se escrever pedindo revisão, o Lucas reverte pelo painel. Conta desativada volta pelo botão Reativar (o `PATCH /users/{id}/active` já existe).
- O acesso depende só de `status`: toda conta aprovada vê todas as análises. Papel e `clearance` ficam como estão (`autenticado`, 0), e o painel só os mostra. Restringir análises por papel fica para quando houver uma análise só para a equipe interna.
- Na Parte 2, as portas da home e do `/explore` ficam visíveis para todo mundo. Sem login, cada porta leva a `/login?next=/map?a=<id>`, e a tela de login tem o link "Pedir acesso". Assim a home também traz pedidos de acesso. Na Parte 1, enquanto não há login, elas continuam escondidas.

## Para o builder

- Ordem: Parte 1 primeiro, junto com os PRs 1, #32 e 2. A Parte 2 vem num branch próprio a partir do `main`, quando esses PRs entrarem.
- Visual do painel e dos formulários: seguir o design do site (claro, sem enfeites de template).
- Limites exatos de pedidos por minuto, textos dos e-mails e aviso de privacidade: o builder propõe e o Lucas revisa.
- Lista de páginas que continuam públicas com o login ligado: o builder levanta e o Lucas confirma.
- Testes:
  - pytest para cada transição de estado, tokens (expirado, usado, errado), proteção dos endpoints e o mailer em modo log;
  - jest para o que a chave e a sessão escondem;
  - um e2e que confirma que o mapa público carrega sem login e sem análises.
- Implantação: a migration 040 roda no banco da VM; o `.env` do backend recebe as variáveis de SMTP (a senha de app é gerada pelo Lucas); o frontend é publicado com `deploy.sh`. Os passos vão num guia como o `COMMITS_2026-11-22.md`.
