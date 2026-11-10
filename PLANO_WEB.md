# Plano de transferência para a web — Vite + React (PWA)

Objetivo: trocar o app React Native por um app web instalável (PWA), hospedado
na internet e acessado pelo celular e pelo PC, com os dados no Supabase. O app
fica mais simples de manter: um código só, sem build nativo, sem Gradle e sem
bibliotecas nativas.

## 1. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Plataforma | App web com Vite + React + TypeScript, instalável como PWA no celular e no PC |
| Hospedagem | Vercel (gratuita), publicando sozinha a cada push na `main` |
| Dados | Tudo no Supabase. Gastos pessoais ficam privados pelas regras de acesso (RLS): só o dono vê |
| Planilha | Pessoal: cada usuário tem a sua (entradas, gastos, reserva, investimentos) |
| Chat e IA | Removidos. Gastos são lançados pelo formulário |
| Notificações do banco | Removidas: a web não lê notificações de outros apps |
| Inspetor do banco | Removido: o painel do Supabase faz esse papel |
| App React Native | Desligado depois que os dados do celular forem enviados para a nuvem (fase 9) |

## 2. Decisões que ainda faltam

Cada uma tem um padrão proposto. O plano segue o padrão até você decidir outra coisa.

| # | Pergunta | Padrão proposto |
|---|---|---|
| D1 | Investimentos: só os aportes, ou também o saldo atualizado à mão (para ver o rendimento)? | Aportes e resgates, com saldo atualizado à mão opcional por mês |
| D2 | Divisão da sobra do mês: valores decididos na hora ou regra fixa (ex.: 40% reserva, 60% investimento)? | Valores na hora, com uma sugestão por porcentagem configurável |
| D3 | Pluggy (tela Bancos): manter, deixar para depois ou remover? | Deixar para depois (fase opcional O1). As Edge Functions continuam no Supabase |
| D4 | Bloqueio com digital na web (WebAuthn): fazer? | Deixar para depois (fase opcional O2) |
| D5 | Gasto pessoal de outra pessoa (ex.: lançar um gasto pessoal da Ana pelo seu celular): continua existindo? | Não. Na web cada pessoa tem conta e lança os próprios gastos pessoais |
| D6 | Contas a pagar (cartões e boletos): só suas, ou compartilhadas com a família? | Só suas. Uma compra marcada como "Família" vira gasto de família ao ser paga |

## 3. O que fica, o que sai, o que muda

| Funcionalidade (app atual) | Na web |
|---|---|
| Login e cadastro | Fica. Ganha "Esqueci a senha", que na web funciona pelo link do e-mail |
| Digitar gasto (data com máscara e calendário) | Fica. Calendário nativo do navegador (`<input type="date">`) |
| Detalhes (histórico com editar e apagar) | Fica |
| Categorias | Fica, por usuário. As palavras-chave saem (eram do chat e das notificações) |
| Relatórios (Meus e Família, filtros, gráfico) | Fica |
| Contas a pagar (cartões, parcelas, faturas, boletos) | Fica. O pagamento vira uma função no banco, numa transação só |
| Família (criar, convite, membros, sair) | Fica |
| Gastos da família (quem lançou, contestação) | Fica |
| Perfil | Fica |
| Planilha (entradas, reserva, investimentos) | **Nova** |
| Chat, IA offline, modelo de IA | Sai |
| Notificações do banco | Sai |
| Inspetor do banco | Sai |
| Bancos (Pluggy) | Opcional, depois (D3) |
| Bloqueio com digital | Opcional, depois (D4) |
| Sincronização (push/pull, cursores, `pushed_at`) | Sai: os dados já estão na nuvem |
| SQLite local, Drizzle, migrations locais | Saem |

## 4. Arquitetura

```
Celular / PC (navegador ou PWA instalado)
┌───────────────────────────────────────────────┐
│ App React (Vite)                              │
│  telas ── hooks (TanStack Query) ── api/*.ts  │──► Supabase
│  cache persistido no IndexedDB (leitura       │     Auth, Postgres + RLS,
│  offline dos últimos dados carregados)        │     funções SQL (RPC),
└───────────────────────────────────────────────┘     Edge Functions
        ▲
        │ arquivos estáticos
   Vercel (hospedagem)
```

- Sem servidor próprio. Toda regra de acesso fica na RLS do Postgres; operações que precisam acontecer juntas (pagar fatura, contestar) ficam em funções SQL chamadas por RPC.
- **Offline:** o app abre sem internet (os arquivos ficam em cache pelo service worker) e mostra os últimos dados carregados. Lançar e editar exigem internet; sem conexão, os botões de salvar ficam desativados e aparece um aviso. Fila de gravações offline fica fora desta versão.

### Bibliotecas

| Uso | Biblioteca | Por quê |
|---|---|---|
| Build e dev server | `vite`, `@vitejs/plugin-react` | Base do app |
| Linguagem | `typescript` | Mesmo padrão do projeto atual |
| Rotas | `react-router` (v7, modo biblioteca) | Rotas simples de app só cliente |
| Backend | `@supabase/supabase-js` | O mesmo SDK do app atual |
| Cache e carregamento | `@tanstack/react-query` + `@tanstack/query-sync-storage-persister` (ou o persister assíncrono com IndexedDB) | Cache, recarregar ao voltar para a aba, leitura offline |
| PWA | `vite-plugin-pwa` | Manifesto, ícones, service worker, aviso de nova versão |
| Gráficos | `recharts` | Gráficos dos relatórios e da planilha |
| Ícones | `lucide-react` | Continuação do Feather, com os mesmos nomes na maioria |
| Estilo | CSS Modules + variáveis CSS com as cores atuais (`src/theme/colors.ts`) | Sem dependência extra; mantém a identidade visual |
| Testes | `vitest`, `@testing-library/react`, `jsdom` | Mesmo estilo dos testes do Jest atual |
| Tipos do banco | `npx supabase gen types typescript` | Tipos gerados a partir do schema, no lugar dos tipos manuais |

## 5. Estrutura de pastas

O app web fica numa pasta nova, `web/`, no mesmo repositório. A pasta `supabase/` continua na raiz e serve aos dois enquanto o app React Native existir. Na fase 10, o conteúdo de `web/` pode subir para a raiz.

```
web/
  index.html
  vite.config.ts            Vite + PWA
  vercel.json               reescrita de rotas para o index.html (SPA)
  .env.example              VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
  public/                   ícones do PWA (192, 512, maskable), favicon
  src/
    main.tsx                React, QueryClient, Router
    app/
      router.tsx            rotas e proteção por login
      Layout.tsx            menu lateral no PC, gaveta no celular
      AuthGate.tsx          espera a sessão; sem sessão, vai para /entrar
      OfflineBanner.tsx
    lib/
      supabase.ts           cliente e invokeFunction (vem de src/backend/supabase.ts)
      database.types.ts     gerado pelo Supabase CLI
      queryClient.ts        cache persistido
    utils/                  money, dates, dateMask, uuid (copiados do app atual)
    theme/                  tokens.css (cores e fontes)
    components/             Button, Card, Chip, Tabs, Modal, Sheet, MoneyInput,
                            DateInput, CategoryPicker, ScopeToggle, EmptyState
    features/
      auth/                 login, cadastro, esqueci a senha, nova senha
      expenses/             api, hooks, formulário, lista (Detalhes), edição
      categories/           api, hooks, telas
      family/               api, hooks, tela Família
      familyExpenses/       api, hooks, familyExpenseView.ts (copiado), telas
      reports/              report.ts (copiado), hooks, gráficos, tela
      bills/                schedule.ts (copiado), api, telas
      sheet/                planilha: api, hooks, cálculos, telas
      profile/
    test/                   setup do Vitest
```

## 6. Banco de dados (Supabase) — schema v2

Uma migration nova em `supabase/migrations/`. O schema atual da família e da Pluggy continua; o que muda está abaixo.

### 6.1 Convenções

- Toda tabela de dados do usuário tem `user_id uuid not null default auth.uid()`.
- `id uuid primary key default gen_random_uuid()`. Para os dados vindos do celular, o id antigo é mantido (os ids locais já são UUID).
- Valores em centavos (`integer`), datas do gasto em `date`, horários em `timestamptz`.
- Exclusão lógica com `deleted_at` onde a exclusão precisa aparecer para outros (gastos). Nas tabelas só do dono, exclusão de verdade.
- RLS ligada em todas. Nenhuma tabela aceita `anon`.

### 6.2 Tabelas

**`categories`** — categorias de cada usuário.
- `id`, `user_id`, `name`, `icon` (nome do ícone), `sort_order`, `created_at`, `updated_at`, `deleted_at`.
- Ao criar a conta, o gatilho de novo usuário grava as categorias padrão (as mesmas de `src/features/expenses/categories.ts`).
- RLS: o dono lê e escreve. Membros da família leem as categorias usadas nos gastos de família pelo nome e ícone guardados no próprio gasto (ver abaixo), então não precisam ler esta tabela.

**`expenses`** — um lugar só para gastos pessoais e de família (substitui `family_expenses`).
- `id`, `user_id` (quem lançou), `scope` (`personal` | `family`), `family_id` (preenchido quando `scope = 'family'`), `amount_cents` (> 0), `category_id`, `category_name`, `category_icon` (cópia, para a família ver sem acessar as categorias do outro), `date`, `description`, `source` (`manual` | `installment` | `bank` | `import`), `created_at`, `updated_at`, `deleted_at`.
- Restrição: `scope = 'family'` exige `family_id`; `scope = 'personal'` exige `family_id` nulo.
- Gatilho: ao gravar, preenche `category_name` e `category_icon` a partir de `category_id` e atualiza `updated_at`. Ao virar gasto de família, `family_id` recebe `my_family_id()`.
- RLS:
  - leitura: `user_id = auth.uid()` **ou** (`scope = 'family'` e `family_id = my_family_id()`);
  - inserção: `user_id = auth.uid()`, e `family_id` só pode ser a própria família;
  - edição: o dono sempre; gastos de família também por qualquer membro (como hoje);
  - exclusão: só lógica, pela edição de `deleted_at`.
- Índices: `(user_id, date)`, `(family_id, date)`.

**`expense_disputes`** — passa a apontar para `expenses(id)`. As funções `open_dispute` e `resolve_dispute` mudam só a tabela consultada; as regras continuam as mesmas.

**`credit_cards`** — `id`, `user_id`, `name`, `closing_day`, `due_day`, timestamps.

**`payables`** — `id`, `user_id`, `kind` (`card` | `boleto`), `card_id`, `description`, `category_id`, `scope`, `total_cents`, `installments_count`, `start_date`, timestamps.

**`payable_installments`** — `id`, `payable_id`, `user_id`, `number`, `amount_cents`, `reference_month` (`AAAA-MM`), `due_date`, `paid_at`, `expense_id` → `expenses(id)`, timestamps.

**Planilha** (detalhes na seção 9):

- **`incomes`** — `id`, `user_id`, `date`, `description`, `amount_cents`, `created_at`, `updated_at`.
- **`reserve_movements`** — `id`, `user_id`, `date`, `kind` (`deposit` | `withdraw`), `amount_cents`, `note`.
- **`investment_assets`** — `id`, `user_id`, `name`, `kind` (`tesouro` | `cdb` | `acoes` | `fundos` | `cripto` | `outro`), `archived_at`.
- **`investment_movements`** — `id`, `user_id`, `asset_id`, `date`, `kind` (`contribution` | `redemption`), `amount_cents`, `note`.
- **`investment_balances`** — saldo informado à mão (D1): `asset_id`, `month` (`AAAA-MM`), `balance_cents`, chave primária (`asset_id`, `month`).
- **`user_settings`** — `user_id` (chave), `reserve_goal_months` (padrão 6), `reserve_goal_cents` (opcional, sobrepõe o cálculo por meses), `split_reserve_percent` (D2, padrão 40).

Todas com RLS de dono: `user_id = auth.uid()` para tudo.

### 6.3 Funções SQL (RPC)

Operações que precisam acontecer juntas viram funções `security invoker` (rodam com as permissões do usuário, então a RLS continua valendo):

| Função | O que faz |
|---|---|
| `create_payable(...)` | Grava a compra ou o boleto e as parcelas, numa transação. O cálculo das parcelas continua em TypeScript (`schedule.ts`), que manda as parcelas prontas |
| `pay_invoice(card_id, month, paid_on)` | Marca como pagas todas as parcelas da fatura e cria um gasto para cada uma |
| `pay_installment(installment_id, paid_on)` | Paga uma parcela de boleto e cria o gasto |
| `delete_payable(id)` | Apaga uma compra sem parcelas pagas |
| `month_sheet(month)` | Devolve os totais do mês para a planilha: entradas, gastos pessoais, reserva, aportes e resgates (uma chamada só) |

`create_family`, `join_family`, `leave_family`, `regenerate_invite_code`, `open_dispute` e `resolve_dispute` continuam como estão.

### 6.4 Migração dos dados que já estão no Supabase

Na mesma migration:

1. Copiar `family_expenses` para `expenses` com `scope = 'family'`, `user_id = created_by` e o mesmo `id`. Linhas com `created_by` nulo (usuário apagado) ficam com o dono da família.
2. Trocar a chave de `expense_disputes.expense_id` para `expenses(id)`.
3. Remover `family_expenses` só na fase 10, depois de desligar o app React Native (até lá, o app antigo ainda grava nela).

### 6.5 Configuração do Auth

- **Site URL:** o endereço da Vercel (ex.: `https://control.vercel.app`).
- **Redirect URLs:** o mesmo endereço e `http://localhost:5173` (desenvolvimento), para os links de confirmação e de nova senha.
- **Confirm email:** pode ser religado: na web o link abre o próprio app.

## 7. Código reaproveitado do app atual

Copiado para `web/src`, com os testes convertidos do Jest para o Vitest (a sintaxe é praticamente a mesma):

| Arquivo atual | Destino | Ajuste |
|---|---|---|
| `src/utils/money.ts`, `dates.ts`, `dateMask.ts`, `uuid.ts` | `web/src/utils/` | Nenhum |
| `src/features/bills/schedule.ts` | `features/bills/` | Nenhum |
| `src/features/reports/report.ts` | `features/reports/` | Tipo `ExpenseListItem` vem dos tipos novos |
| `src/features/familyExpenses/familyExpenseView.ts` | `features/familyExpenses/` | Os nomes passam a vir dos perfis, não da tabela `members` |
| `src/features/expenses/categories.ts` (lista padrão) | Vira o conteúdo do gatilho de novo usuário (SQL) | — |
| `src/backend/*.ts` | `features/*/api.ts` | Sem `requireSupabase`: o cliente sempre existe na web |
| `src/theme/colors.ts` | `theme/tokens.css` | Vira variáveis CSS |

Reescritos: todas as telas (componentes React Native viram HTML), os repositórios (de Drizzle para consultas do Supabase) e a navegação.

## 8. Telas e rotas

Menu lateral no PC; no celular, uma barra inferior com as 4 telas mais usadas e o resto num menu.

| Rota | Tela | Conteúdo |
|---|---|---|
| `/entrar`, `/cadastro`, `/esqueci-senha`, `/nova-senha` | Autenticação | Formulários. Sem sessão, só essas rotas existem |
| `/` | Início | Resumo do mês: gastos, sobra, reserva, atalho para lançar |
| `/gastos/novo` | Novo gasto | Valor, data, categoria, Meu/Família, descrição |
| `/gastos` | Detalhes | Histórico por dia, com editar e apagar |
| `/familia/gastos` | Gastos da família | Mês, total, por categoria, quem lançou, contestação |
| `/relatorios` | Relatórios | Abas Meus/Família, filtros, gráfico |
| `/contas` | Contas a pagar | Cartões e faturas, boletos |
| `/contas/cartao/:id` | Cartão | Criar e editar |
| `/contas/fatura/:cardId/:month` | Fatura | Itens e "Pagar fatura" |
| `/contas/nova` | Compra ou boleto | Formulário com parcelas |
| `/planilha` | Planilha do mês | Seção 9 |
| `/planilha/investimentos` | Investimentos | Ativos, aportes, saldo |
| `/familia` | Família | Criar, entrar, convite, membros, sair |
| `/configuracoes/categorias` | Categorias | Lista e edição |
| `/perfil` | Perfil | Nome, e-mail, sair |

## 9. Planilha (nova)

### 9.1 Visão do mês

```
OUTUBRO 2026                                  < >
1. Entradas                       R$ 6.000,00   [+ entrada]
2. Gastos pessoais               -R$ 3.800,00   (dos gastos lançados, por categoria)
3. Sobra                          R$ 2.200,00
4. Destino da sobra
   Reserva                           800,00     [guardar] [retirar]
   Investimentos                   1.200,00     [aportar] [resgatar]
   Sem destino                       200,00
```

- **Gastos do mês** = gastos pessoais pagos no mês (inclui as parcelas pagas, que já viram gastos). Gastos de família não entram (D6 / planilha pessoal). Se depois quiser incluir "minha parte" dos gastos de família, é uma opção a acrescentar.
- **Sugestão de divisão (D2):** botão "Distribuir sobra" que preenche reserva e investimento pela porcentagem configurada; você ajusta antes de confirmar.
- **Sem destino** é o que sobrou sem ir para lugar nenhum. Fica visível de propósito, para você decidir.

### 9.2 Acumulado

Tabela com uma linha por mês: entradas, gastos, guardado na reserva, investido, saldo da reserva, total investido. Gráfico de linha da reserva e dos investimentos ao longo do tempo.

### 9.3 Reserva de emergência

- Saldo = soma dos depósitos − soma das retiradas.
- Meta = `reserve_goal_cents` ou `reserve_goal_months` × média dos gastos dos últimos 6 meses.
- Barra de progresso e "faltam R$ X (N meses no ritmo atual)".

### 9.4 Investimentos

- Lista de ativos (Tesouro Selic, CDB do banco X...), com total aportado e, se informado, o saldo atual e a diferença (rendimento).
- Lançar aporte ou resgate num ativo. Atualizar saldo do mês (D1).

## 10. Fases de implementação

Cada fase termina com typecheck, lint, testes e build passando, e é publicada na Vercel. As fases 1 a 3 já entregam um app usável.

| Fase | Entrega | Conteúdo |
|---|---|---|
| 0 | Preparação | Fechar as decisões D1 a D6. Backup do banco do Supabase (painel → Database → Backups) |
| 1 | Base | `web/` com Vite, TypeScript, ESLint, Prettier, Vitest; tokens de cor; cliente Supabase; tipos gerados; Router; layout responsivo; PWA básico (manifesto, ícones, service worker); projeto na Vercel ligado ao GitHub com as variáveis de ambiente |
| 2 | Banco v2 | Migration da seção 6: tabelas, RLS, gatilhos, funções, cópia de `family_expenses`. Testes de RLS (um usuário não lê os gastos pessoais do outro; membro lê os de família) |
| 3 | Conta e gastos | Login, cadastro, esqueci a senha; Novo gasto; Detalhes com editar e apagar; Categorias |
| 4 | Família | Tela Família; Gastos da família com quem lançou e contestação |
| 5 | Relatórios | Abas, filtros, gráfico |
| 6 | Contas a pagar | Cartões, compras parceladas, boletos, faturas, pagar |
| 7 | Planilha | Entradas, sobra, reserva, investimentos, acumulado, metas |
| 8 | PWA completo | Leitura offline (cache persistido), aviso de nova versão, instalação no celular e no PC, ícones finais |
| 9 | Dados do celular | No app React Native, um botão "Enviar meus dados para a nuvem" em Perfil: envia gastos pessoais, categorias, cartões, compras e parcelas para as tabelas v2, mantendo os ids (pode rodar mais de uma vez sem duplicar). Conferir na web |
| 10 | Desligar o app antigo | Remover `family_expenses` e o que só o app nativo usava; apagar o código React Native do repositório (fica no histórico do Git) e subir `web/` para a raiz |

### Opcionais, depois

| | Conteúdo |
|---|---|
| O1 — Pluggy (D3) | Tabelas `bank_items`, `bank_accounts`, `bank_transactions` no Supabase com RLS de dono; a Edge Function `bank-data` passa a gravar direto nelas; telas Bancos e "Passar para os gastos" |
| O2 — Bloqueio (D4) | Passkey (WebAuthn) para abrir o app. Na web isso protege a tela, não os dados guardados no navegador |
| O3 — Lançar offline | Fila de gravações feitas sem internet, enviada quando a conexão volta |

## 11. Riscos e cuidados

- **Privacidade:** os gastos pessoais passam a ficar na nuvem. A proteção é a RLS; a fase 2 tem testes específicos para ela, e nenhuma tabela aceita acesso anônimo.
- **Sessão no navegador:** fica guardada no navegador do aparelho. Em computador compartilhado, é preciso sair da conta.
- **iPhone:** o PWA instala pelo Safari ("Compartilhar → Adicionar à Tela de Início"), com limitações de armazenamento e de notificações.
- **Durante a transição:** o app React Native e o web convivem até a fase 9. Gastos de família feitos no app antigo continuam indo para `family_expenses`; a cópia para `expenses` precisa rodar de novo na fase 9 (a migration é idempotente pelo `id`).
- **Custos:** Supabase e Vercel nos planos gratuitos cobrem o uso de uma família. O plano gratuito do Supabase pausa o projeto após uma semana sem uso; qualquer acesso reativa, mas a primeira abertura fica lenta.
