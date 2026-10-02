# Plano de implementação — GastosFamilia (React Native CLI)

## Objetivo da primeira versão

O app funciona offline, sem backend e sem conta de usuário. A internet só é usada uma vez, para baixar o modelo de IA na primeira abertura. O usuário registra gastos escrevendo no chat, em linguagem natural. A IA local interpreta a mensagem e preenche os campos do gasto. O usuário só confirma ou corrige.

Ficam de fora da primeira versão, descritos em "Futuro":
- Voz.
- Login, família compartilhada e sincronização com Supabase.

## Ponto de partida

O projeto já existe e foi criado com o React Native CLI.

| Item | Estado atual |
|---|---|
| React Native | 0.87.1, Nova Arquitetura e Hermes ativos |
| React | 19.2.3 |
| Navegação | React Navigation 7 já instalado (native-stack, bottom-tabs, drawer) |
| Animação | reanimated 4 + react-native-worklets + gesture-handler 3 já instalados |
| Código próprio | Pastas vazias em `src/components`, `src/pages/home`, `src/pages/relatory`, `src/routes` |
| App.tsx | Ainda é a tela padrão do template |

Decisões para este repositório:

- Todo o código em TypeScript, com `strict` ligado no tsconfig. O projeto já foi criado com o template TypeScript.
- Manter os nomes de pasta que já existem: `src/pages` no lugar de `screens` e `src/routes` no lugar de `navigation`.
- A tela `home` vira o chat, que é a entrada principal de gastos. A tela `relatory` vira o dashboard de relatórios.
- Mover o `App.tsx` da raiz para `src/App.tsx` e ajustar o `index.js`.
- Remover `@react-native/new-app-screen` quando o App.tsx novo entrar.
- Avaliar se o drawer é necessário. Se não for, desinstalar `@react-navigation/drawer`.

## Estrutura alvo

```
src/
├── App.tsx                 # Providers: QueryClient, tema, navegação
├── routes/                 # RootNavigator, MainTabs, types.ts
├── pages/
│   ├── home/               # Chat: entrada principal de gastos
│   ├── relatory/           # Relatórios por mês e categoria
│   ├── expenses/           # Lista e edição de gastos
│   ├── members/            # Quem gastou: membros cadastrados no aparelho
│   ├── settings/           # Backup, modelo de IA e preferências
│   └── setup/              # Instalação do modelo de IA
├── features/               # chat, expenses, relatory, members, backup
├── ai/                     # models, llm, parsers, expensePipeline.ts
├── db/                     # client, schema, migrate, migrations, repositories
├── lib/                    # queryClient, storage (MMKV)
├── components/ui/
├── theme/
├── utils/                  # money, dates, uuid
└── types/
```

## Como o modelo chega ao aparelho

Decisão: o app baixa o modelo na primeira abertura. Depois disso, tudo funciona sem internet.

Como funciona:
1. Na primeira abertura, a tela de setup pede para conectar no Wi-Fi e mostra o tamanho do download, cerca de 0,4 GB.
2. O `modelManager.ts` baixa o arquivo `.gguf` direto do Hugging Face com o `react-native-blob-util`, mostrando o progresso. O destino é a pasta externa própria do app, `/sdcard/Android/data/<applicationId>/files/models/`. O app lê essa pasta sem pedir permissão.
3. O download vai para um arquivo temporário na pasta interna do app. Só depois de validar o checksum ele é renomeado para o nome final. Assim um download interrompido nunca é confundido com um modelo pronto.
4. Se a conexão cair, o download recomeça do ponto onde parou, usando o cabeçalho `Range`. Se o servidor não aceitar, recomeça do zero.
5. A tela fica acesa durante o download, para o sistema não suspender o app.
6. Se a versão do modelo no `registry.ts` mudar em uma atualização do app, o novo modelo é baixado e o antigo é apagado.

Limitação aceita: desinstalar o app apaga o modelo. Ao reinstalar, é preciso baixá-lo de novo ou copiá-lo do computador.

Atalho sem download, pelo computador: o `adb` consegue gravar na pasta externa do app. Com o modelo já baixado uma vez no PC, basta abrir o app uma vez para a pasta existir e copiar o arquivo:
```powershell
adb shell mkdir -p /sdcard/Android/data/com.control/files/models
adb push C:modelosmodelo.gguf /sdcard/Android/data/com.control/files/models/
```
No build de debug com `applicationIdSuffix ".debug"`, o caminho usa `com.control.debug`. Ao abrir, o `modelManager.ts` encontra o arquivo, valida o checksum e pula o download. O nome do arquivo precisa ser o mesmo do `registry.ts`.

Opção extra na tela de setup: **Importar arquivo do celular.** Abre o seletor de arquivos para escolher um `.gguf` salvo, por exemplo, na pasta Downloads, e copia para a pasta do app. A pasta Downloads não é apagada ao desinstalar, então uma cópia guardada lá serve para qualquer reinstalação, mesmo sem computador.

## Instalação no celular para uso pessoal

O APK de debug depende do Metro rodando no computador. Para usar no dia a dia, é preciso um APK de release, que já leva o JavaScript dentro:
1. Gerar uma keystore própria com `keytool` e configurar a assinatura de release no `android/app/build.gradle`. A keystore e as senhas ficam fora do git.
2. Gerar o APK com `cd android && ./gradlew assembleRelease`.
3. Instalar pelo cabo com `adb install -r android/app/build/outputs/apk/release/app-release.apk`. O `-r` atualiza o app sem apagar os dados.
4. Sempre assinar com a mesma keystore. Uma keystore diferente obriga a desinstalar o app, e isso apaga os gastos.

## Fases

Cada fase termina com o app rodando em aparelho físico Android arm64.

### Fase 0 — Base do projeto
1. Mover o App.tsx para `src/` e criar os providers.
2. Criar `src/routes` com RootNavigator e MainTabs usando telas placeholder. Abas: Chat, Gastos, Relatórios e Membros.
3. Instalar e configurar NativeWind. Conferir antes a versão compatível com reanimated 4, pois a v4 do NativeWind depende do reanimated 3.
4. Instalar `react-native-mmkv` para preferências, como o membro padrão e o modelo escolhido.
5. Configurar aliases de import (`@/`) no tsconfig e no babel.
6. **Pronto quando:** as abas navegam entre telas vazias com estilo NativeWind.

### Fase 1 — Banco local
1. Instalar `@op-engineering/op-sqlite`, `drizzle-orm`, `drizzle-kit`, `babel-plugin-inline-import`, `react-native-get-random-values` e `uuid`. O op-sqlite não precisa de configuração extra no RN CLI. No iOS, o pod install roda sozinho nas versões novas do RN.
2. Importar `react-native-get-random-values` no topo do `index.js`, antes de qualquer outro import.
3. Configurar a compilação do SQLite no `package.json`:
   ```json
   "op-sqlite": {
     "performanceMode": true
   }
   ```
   O `performanceMode` desliga alguns recursos pouco usados em troca de velocidade. Rodar os testes depois de ligar. Toda mudança nesse bloco exige rebuild nativo.
4. Decidir nesta fase se o banco será criptografado com `"sqlcipher": true`. Ligar depois exige migrar os dados de quem já usa o app. Se ligar, a chave fica no Keychain e no Keystore via `react-native-keychain`, nunca no código ou no MMKV.
5. Abrir o banco no local padrão, sem passar `location`. No iOS isso é a pasta Library e no Android a pasta de bancos do app. Não usar o cartão SD.
6. Ao abrir, executar `PRAGMA journal_mode = WAL` e `PRAGMA foreign_keys = ON`. Não usar `journal_mode` MEMORY ou OFF, porque perdem a proteção contra corrupção.
7. Adicionar a extensão `.sql` no metro.config.js e o plugin no babel.config.js.
8. Escrever `db/schema.ts` com membros, categorias, palavras-chave de categoria, gastos e mensagens do chat. Cada linha tem `id` UUID, `created_at`, `updated_at` e `deleted_at`. Esses campos custam pouco agora e evitam migração se a sincronização entrar no futuro.
9. Gerar migrations com drizzle-kit e rodar em `db/migrate.ts` na inicialização, usando o driver `drizzle-orm/op-sqlite`.
10. Seed na primeira abertura com categorias padrão e suas palavras-chave, como Alimentação com "mercado", "padaria" e "ifood".
11. Criar repositórios e hooks com TanStack Query, invalidando as queries após cada escrita.
12. Testar os repositórios no Jest. O op-sqlite traz uma versão para Node com a mesma API, feita para testar queries.
13. Tela de lista de gastos e tela de edição com react-hook-form + zod. A edição serve para corrigir, não é a forma principal de registrar. Valores guardados em centavos inteiros.
14. Relatórios com victory-native + Skia.
15. **Pronto quando:** gastos inseridos por um script de teste persistem após fechar o app e aparecem na lista e nos gráficos.

### Fase 2 — Chat que interpreta as mensagens
1. Instalar `llama.rn` (0.12.x, exige Nova Arquitetura, já ativa) e `react-native-blob-util`, usado para baixar o modelo. O postinstall do llama.rn baixa os binários pré-compilados na hora do `npm install`. Não é preciso compilar o llama.cpp.
2. `ai/models/registry.ts` com URL, nome do arquivo, versão, tamanho, checksum e RAM mínima do modelo.
3. `modelManager.ts` faz o download descrito em "Como o modelo chega ao aparelho" e informa à tela de setup quando o modelo está pronto.
4. Tela de setup com o progresso do download e a opção de pular. Sem modelo, ou se faltar espaço ou memória, o chat funciona só com as regras do item 7. O download pode ser feito depois pelas configurações.
5. `llamaService.ts` chama `initLlama` ao entrar no chat e `release` ao sair. Parâmetros iniciais: `n_ctx: 2048`, `use_mlock: true` e `n_gpu_layers: 99`. Verificar no resultado do init os campos `gpu` e `reasonNoGPU` e registrar se caiu para CPU.
6. Saída estruturada pelo `response_format` com `json_schema` na chamada `completion`. O llama.rn converte o schema em gramática GBNF sozinho. `expenseSchema.ts` define um schema zod convertido para JSON Schema, usado tanto na geração quanto na validação. Campos: valor, data, categoria, membro e descrição.
7. `expensePipeline.ts` tenta primeiro as regras no código e só chama o LLM quando elas não montam o gasto completo:
   - `moneyParser.ts` extrai o valor, como "45", "R$ 12,90" e "cinquenta reais".
   - `dateParser.ts` resolve "ontem", "sexta" e "dia 10" com date-fns. Sem data na frase, usa hoje.
   - `categoryMatcher.ts` busca as palavras-chave do banco. As correções do usuário no cartão de confirmação criam palavras-chave novas.
   - `memberMatcher.ts` reconhece nomes de membros na frase. Sem nome, usa o membro padrão.
   - Quando o LLM é chamado, ele recebe o valor e a data já extraídos, a lista de categorias e a de membros, e completa só o que falta.
8. Uma mensagem pode ter mais de um gasto, como "45 no mercado e 20 de uber". O schema aceita uma lista, e cada gasto ganha o próprio cartão.
9. O cartão de confirmação mostra os campos preenchidos, e cada um pode ser tocado para corrigir. Nada é salvo sem confirmação.
10. **Pendente:** salvar o histórico do chat no banco. Hoje os gastos confirmados já vão para o banco, mas as mensagens ficam só na memória e somem ao fechar o app. O que falta:
    - Tabela `chat_messages` com `id`, tipo da mensagem (usuário, assistente ou cartão de gasto), texto, situação do cartão (pendente, salvo), dados do rascunho do gasto em JSON e `expense_id` apontando para o gasto confirmado. Mais os campos de controle de sempre: `created_at`, `updated_at` e `deleted_at`.
    - Gravar cada mensagem ao ser enviada e atualizar o cartão quando ele for confirmado ou editado.
    - Ao abrir o chat, carregar as mensagens mais recentes, como as últimas 50, e buscar as anteriores ao rolar para cima.
    - Cartões que ficaram pendentes voltam como pendentes e ainda podem ser confirmados.
    - Opção de apagar o histórico nas Configurações, sem apagar os gastos.
11. Testes com Jest usando o mock oficial `llama.rn/jest/mock`. Montar uma lista de pelo menos 50 frases reais de gasto com a resposta esperada e medir a taxa de acerto das regras e do modelo.
12. **Pronto quando:** "gastei 45 no mercado ontem" vira um gasto confirmado no banco com o celular em modo avião.

Escolha do modelo: um modelo instruct pequeno em GGUF com quantização Q4_0. Q4_0 é um dos dois formatos aceitos pelo backend OpenCL do Android. Avaliar modelos com bom português e template de chat reconhecido pelo llama.rn. Comparar dois tamanhos com as frases de teste do item 11:

| Tamanho | Arquivo aproximado | RAM aproximada com o chat aberto |
|---|---|---|
| 0,5B | 0,4 GB | 1 GB |
| 1,5B | 0,9 a 1 GB | 1,5 a 2 GB |

Se o de 0,5B acertar o suficiente junto com as regras, ele vira o padrão.

Resultado dos testes: com 15 frases, o 0,5B acertou a categoria em 3 e o 1,5B em 12. O 1,5B virou o padrão. No celular sem GPU compatível, a primeira frase leva cerca de 10 s e as seguintes de 1 a 3 s, porque o prompt fixo é reaproveitado.

### Fase 2b — Chat que entende outros pedidos (pendente)

O chat deixa de servir só para registrar gastos e passa a reconhecer outros pedidos. A IA só identifica a intenção. Quem executa e responde é o app, com consultas ao banco e textos fixos. O modelo nunca calcula números nem escreve a resposta, porque nos testes ele inventou gastos para "qual o total do mês?".

Como funciona:
1. **Intenção:** a mensagem é classificada numa lista fechada de ações, com JSON Schema e `enum`, como já é feito com a categoria. Palavras óbvias, como "quanto" e "total", são resolvidas pelas regras sem chamar a IA.
2. **Parâmetros:** período, categoria e valor saem das regras existentes, como o `dateParser` e o `categoryMatcher`. A IA entra só no que as regras não resolverem.
3. **Execução:** cada intenção chama código comum, como uma soma no SQLite.
4. **Resposta:** texto montado pelo app, como "Em setembro vocês gastaram R$ 1.240,00 em Mercado."

Intenções previstas:

| Mensagem de exemplo | Intenção | O app faz |
|---|---|---|
| "gastei 45 no mercado" | registrar gasto | O fluxo atual |
| "quanto gastei esse mês?" | total do período | Soma os gastos do período |
| "quanto foi de mercado em setembro?" | gastos por categoria | Filtra categoria e período |
| "apaga o último" | apagar gasto | Mostra o gasto e pede confirmação |
| "coloca ração em mercado" | criar palavra-chave | Adiciona a palavra à categoria |
| "abre os relatórios" | navegar | Abre a tela |

Ordem de implementação:
1. Total do período e gastos por categoria. Elas só leem dados, então um erro de interpretação não estraga nada.
2. Navegar para telas.
3. Apagar e corrigir gastos, sempre com confirmação.
4. Criar categorias e palavras-chave.

Regras:
- Só funciona com o modelo de 1,5B. O 0,5B continua só com as regras.
- No máximo umas 8 a 10 intenções. Acima disso, a precisão cai.
- Toda ação que altera dados pede confirmação antes.
- Uma bateria de frases de teste por intenção, medindo a taxa de acerto, como foi feito com as categorias.

### Fase 3 — Backup em arquivo
Sem nuvem, desinstalar o app ou perder o celular apaga os gastos. O backup em arquivo resolve isso sem internet.

O que entra no backup:
- Gastos, categorias, palavras-chave aprendidas e membros.
- Histórico do chat, como opção desligada por padrão.
- O modelo de IA fica de fora. Ele não tem dados do usuário e pode ser baixado de novo.

Passos:
1. Instalar `react-native-share` e `@react-native-documents/picker`. O `react-native-blob-util` já está no projeto e grava os arquivos.
2. `features/backup/exportBackup.ts` lê todas as tabelas e gera um JSON com `schemaVersion`, data de exportação e os dados. Valores continuam em centavos e datas em ISO 8601.
3. `features/backup/exportCsv.ts` gera um CSV só com os gastos, separado por ponto e vírgula, para abrir no Excel ou no Google Planilhas. Esse arquivo é só para consulta e não pode ser restaurado.
4. Tela de configurações com três ações:
   - **Salvar na pasta Downloads:** grava o arquivo pela MediaStore com o `react-native-blob-util`. Arquivos na pasta Downloads não são apagados ao desinstalar o app.
   - **Compartilhar:** abre o menu do sistema com o `react-native-share`, para mandar o arquivo para o computador, um cartão de memória ou outro app.
   - **Restaurar:** abre o seletor de arquivos para escolher um JSON de backup.
5. Nome do arquivo com a data, como `gastos-backup-2026-09-29.json`, para nunca sobrescrever um backup anterior.
6. `features/backup/importBackup.ts` valida o arquivo com zod antes de gravar qualquer coisa. Se o `schemaVersion` for mais antigo, converte para o formato atual. Se for mais novo que o app, recusa e pede para atualizar o app.
7. A restauração junta os dados pelo `id` UUID. Um registro que já existe só é substituído se o `updated_at` do arquivo for mais recente. Tudo roda em uma única transação: se algo falhar, nada é gravado.
8. Antes de restaurar, mostrar um resumo com quantos gastos, categorias e membros serão importados, e pedir confirmação.
9. Backup automático: ao abrir o app, se o último backup tiver mais de 7 dias, salvar um novo na pasta Downloads sem perguntar. Guardar a data do último backup no MMKV e mostrar essa data na tela de configurações.
10. Testes no Jest: exportar, apagar o banco, importar e comparar. Testar também um arquivo corrompido e um de versão futura.
11. **Pronto quando:** desinstalar e reinstalar o app, restaurar o arquivo da pasta Downloads e ver todos os gastos de volta.

Proteção extra opcional: o manifesto está com `android:allowBackup="false"`. Ligar o backup automático do Android faz o Google Drive guardar uma cópia do banco quando o celular estiver online. O modelo de IA precisa ficar de fora, pelas regras de exclusão, porque passa do limite de 25 MB desse backup.

## Configuração nativa

### Android
- `android/gradle.properties`: trocar `reactNativeArchitectures` para `arm64-v8a,x86_64`. O llama.rn só inicializa nessas duas arquiteturas. O x86_64 permite testar no emulador, só na CPU e mais devagar.
- No build de release, usar só `arm64-v8a` para reduzir o tamanho do APK.
- `AndroidManifest.xml`: adicionar `android:largeHeap="true"` na tag application.
- `AndroidManifest.xml`: dentro de application, declarar as bibliotecas opcionais de aceleração:
  ```xml
  <uses-native-library android:name="libOpenCL.so" android:required="false" />
  <uses-native-library android:name="libcdsprpc.so" android:required="false" />
  ```
  A primeira habilita GPU OpenCL em Adreno 700 ou superior. A segunda habilita a NPU Hexagon, experimental, em Snapdragon 8 Gen 1 ou superior. Em outros aparelhos o app segue na CPU.
- Manter a permissão `INTERNET` que já existe. Ela é usada pelo download do modelo e pelo Metro durante o desenvolvimento. Fora o download, o app não faz chamadas de rede.
- `android/app/proguard-rules.pro`: adicionar a regra do llama.rn:
  ```
  -keep class com.rnllama.** { *; }
  ```
- `android/app/build.gradle`: ativar `enableProguardInReleaseBuilds`.
- A medição de desempenho vale só em aparelho físico.

### iOS
- Ativar as capabilities Increased Memory Limit e Extended Virtual Addressing no target.
- Metal exige GPU Apple7, ou seja iPhone 12 e mais novos. Aparelhos mais antigos rodam na CPU.
- O simulador de iOS não roda Metal. Testar o LLM só em iPhone físico.
- Rodar `pod install` depois de cada biblioteca nativa.
- O build de iOS exige macOS. Neste ambiente Windows só o Android pode ser testado.

## Riscos

- **Reinstalação:** desinstalar o app apaga o modelo e os gastos. O modelo pode ser baixado de novo, e os gastos voltam pelo backup da Fase 3.
- **Espaço no celular:** conferir o espaço livre antes do download e avisar o usuário se faltar.
- **Perda da keystore:** sem ela não dá para atualizar o app sem desinstalar, e desinstalar apaga os gastos. Guardar a keystore em backup.
- **Link do modelo:** o arquivo no Hugging Face pode mudar ou sair do ar. Fixar a URL em uma revisão específica do repositório, e não na branch principal.
- **Conflito de SQLite:** o op-sqlite compila o próprio SQLite. Qualquer outra lib que traga SQLite, como expo-sqlite, causa erro de build. Conferir isso antes de adicionar dependências.
- **Erro "Base module not found" no Android:** apagar a pasta `caches` do diretório do Gradle do usuário e fazer rebuild.
- **Compatibilidade com RN 0.87:** o llama.rn 0.12.x exige Nova Arquitetura e não declara versão máxima do RN. Instalar e fazer um build de teste logo no início da Fase 2. Conferir o mesmo para op-sqlite e victory-native.
- **Aceleração no Android:** GPU e NPU só funcionam em chips Qualcomm recentes. Em MediaTek, Exynos e Snapdragon antigos tudo roda na CPU. O tempo de resposta precisa ser aceitável nesse pior caso.
- **NativeWind com reanimated 4:** pode exigir NativeWind v5 e Tailwind v4.
- **Memória:** aparelhos com pouca RAM podem não carregar o modelo. Nesse caso o chat continua funcionando só com as regras.
- **Backup esquecido:** o backup manual depende do usuário lembrar. Por isso a Fase 3 inclui o backup automático semanal na pasta Downloads.
- **Restauração após reinstalar:** o Android não deixa um app reinstalado ler sozinho os arquivos da instalação anterior. Por isso a restauração sempre passa pelo seletor de arquivos.

## Futuro

### Sincronização e família compartilhada (fora da primeira versão)

Entra quando o app passar a usar internet.

Onde fica cada parte:
- `supabase/`, na raiz do projeto e fora de `src`. É criada pelo comando `supabase init` da CLI do Supabase e guarda a configuração do backend: `config.toml`, `migrations/` com as tabelas e o RLS em SQL, `seed.sql` e, se houver, `functions/` com as Edge Functions. Nada disso entra no app, e o Metro não empacota essa pasta.
- `src/lib/supabase.ts` e `src/sync/`, dentro de `src`. É o código do app que conversa com o Supabase.
- As Edge Functions rodam em Deno e usam tipos diferentes do React Native. Adicionar `"supabase"` ao `exclude` do `tsconfig.json` para o TypeScript do app não acusar erros nelas.

Passos:
1. Instalar `@supabase/supabase-js`, `react-native-url-polyfill`, `react-native-config` e `@react-native-community/netinfo`.
2. Cliente Supabase com MMKV como storage da sessão. URL e anon key no `.env`, via react-native-config.
3. Migrations do Supabase espelhando o schema local, com RLS por `family_id`.
4. Login, criação de família e convite de membros.
5. Tabela de fila de sync no banco local. `syncEngine.ts` envia a fila e puxa alterações por `updated_at`. Em conflito, vence a última escrita.
6. `syncTriggers.ts` dispara sync ao abrir o app, ao voltar para o primeiro plano e ao reconectar.

### Importação bancária com a Pluggy (fora da primeira versão)

A Pluggy é um agregador de Open Finance no Brasil. Com a autorização do usuário, ela conecta contas e cartões de banco e devolve as transações. Assim os gastos do cartão e do Pix entram no app sem digitar.

Essa parte depende de internet e de um backend. Por isso ela só entra junto ou depois da sincronização com o Supabase. O resto do app continua funcionando offline: as transações importadas ficam no SQLite como qualquer outro gasto.

Arquitetura:
- **Credenciais só no servidor:** o `clientId` e o `clientSecret` da Pluggy nunca vão para o app. Uma Edge Function do Supabase gera o token de conexão de curta duração e o entrega ao app.
- **Conexão do banco:** o app abre o widget Pluggy Connect, onde o usuário escolhe o banco e autoriza. Conferir na documentação da Pluggy qual é o SDK atual para React Native, ou se o caminho é abrir o widget numa WebView.
- **Recebimento das transações:** a Pluggy avisa por webhook quando há dados novos. O webhook cai numa Edge Function, que busca as transações na API da Pluggy e grava numa tabela do Supabase. O app recebe essas linhas pelo sync.
- **Sem duplicar:** cada gasto importado guarda o id da transação na Pluggy. Uma transação que chega de novo atualiza o gasto existente em vez de criar outro.

No app:
1. **Origem nova:** gastos com `source = 'bank'`, o id da transação na Pluggy e a conta de origem. Exige uma migration nova, porque hoje a origem aceita só `chat` e `manual`.
2. **Categoria:** a Pluggy já devolve uma categoria para cada transação. Uma tabela de equivalência leva essas categorias para as do app. A descrição da transação, como "PAG*IFOOD", também passa pelas palavras-chave. A IA entra como reserva.
3. **Fila de revisão:** as transações importadas chegam como pendentes, numa tela própria. O usuário confirma, corrige a categoria, marca como "Meu" ou "Família", ou ignora, por exemplo uma transferência entre contas próprias.
4. **Só saídas:** entradas de dinheiro, estornos e pagamento da fatura do cartão não viram gastos. A fatura em si duplicaria as compras que já vieram do cartão.

Cuidados:
- **Custo:** a Pluggy é um serviço pago, cobrado por conexão ativa. Conferir os planos e o período de teste antes de começar.
- **Dados sensíveis:** dados bancários entram na LGPD. A política de privacidade precisa explicar o uso, o usuário precisa poder desconectar o banco e apagar os dados importados, e o RLS do Supabase precisa restringir as transações à família dona da conta.
- **Consentimento com prazo:** no Open Finance, a autorização expira e precisa ser renovada. O app avisa quando uma conexão parar de atualizar.
- **Uso pessoal:** para um app só seu, conferir se a Pluggy atende pessoa física ou exige empresa, e quais são as regras de homologação para produção.

### Foto de nota fiscal (fora da primeira versão)

O usuário fotografa a nota ou escolhe uma imagem, e o app monta o gasto. A leitura é feita pelo ML Kit, que reconhece texto no próprio aparelho e funciona offline. Os modelos de visão do llama.rn ficaram de fora: no celular sem GPU compatível, eles levariam dezenas de segundos por foto e erram bastante os números de nota fiscal.

Fluxo:
1. **Foto:** um botão no chat abre a câmera ou a galeria, com o `react-native-image-picker`. O `react-native-vision-camera` é a alternativa, se for preciso uma câmera própria no app.
2. **Leitura:** o `@react-native-ml-kit/text-recognition` recebe o caminho da imagem e devolve o texto, em blocos e linhas.
3. **Interpretação, com regras novas para nota fiscal:**
   - **Valor:** a linha com "TOTAL" ou "VALOR A PAGAR", e não o primeiro número da nota.
   - **Data:** o formato dd/mm/aaaa, que o `dateParser` já entende.
   - **Categoria:** o nome do estabelecimento no topo da nota, como "Supermercado" ou "Drogaria", passando pelas palavras-chave. A IA entra como reserva, como no chat.
4. **Confirmação:** o mesmo cartão do chat, com a opção de corrigir antes de salvar. Na tabela de gastos, a origem fica registrada como foto.

Antes de instalar:
- **Versão embutida do ML Kit no Android:** o modelo de leitura vai dentro do app, com alguns MB a mais, e funciona sem internet desde o início. A versão que usa o Google Play Services baixa o modelo no primeiro uso e não serve para o objetivo offline.
- **Compatibilidade:** conferir no repositório de cada pacote o suporte à Nova Arquitetura e ao React Native 0.87.
- **Permissões:** a câmera precisa de permissão no AndroidManifest e no Info.plist. A escolha de foto da galeria usa o seletor do sistema e dispensa permissão nas versões recentes do Android.
- **Build:** as bibliotecas são nativas e exigem recompilar o app.

Limitações esperadas: nota impressa nítida e bem iluminada costuma ser lida bem. Papel amassado, foto torta ou impressão térmica apagada derrubam a precisão. Por isso o cartão de confirmação é obrigatório.

### Voz (fora da primeira versão)

Fica para depois que o chat por texto estiver estável. Ao entrar, ela exige estas mudanças extras na configuração nativa:
- Android: permissão `RECORD_AUDIO` no manifesto e a regra `-keep class com.rnwhisper.** { *; }` no Proguard.
- iOS: `NSMicrophoneUsageDescription` no Info.plist.
- Pasta nova `src/ai/stt/`.
- Riscos: a qualidade da transcrição em português precisa ser testada com frases reais de gasto. Com o chat aberto, o Whisper, o VAD e o LLM ficam na memória ao mesmo tempo, então a RAM mínima tem que somar os três.

Passos:
1. Instalar `whisper.rn` (0.7.x), `@fugood/react-native-audio-pcm-stream` e `react-native-permissions`. O whisper.rn também baixa binários prontos no postinstall.
2. O whisper.rn não grava áudio sozinho. A captura do microfone vem do `audio-pcm-stream`, ligado ao transcritor pelo `AudioPcmStreamAdapter`.
3. O `RealtimeTranscriber` também pede um módulo de arquivos. Criar um adaptador sobre o `react-native-blob-util`, que já está no projeto, seguindo a interface de filesystem do whisper.rn. Se der trabalho demais, usar `react-native-fs`.
4. Registrar no registry os modelos de voz, todos baixados em tempo de execução e nunca empacotados no app:
   - Whisper multilíngue, sem o sufixo `.en`, porque os modelos `.en` só entendem inglês. Começar pelo `base-q8_0` e comparar com o `small-q8_0`. O `tiny` costuma errar muito em português.
   - Silero VAD, que detecta o fim da fala.
   - Opcional: Parakeet TDT 0.6B v3 em `q4_0`, com cerca de 356 MB. Ele suporta português, mas o treino é europeu. Só adotar se transcrever melhor o sotaque brasileiro nos testes.
5. `ai/stt/whisperService.ts` cria o contexto Whisper e o contexto VAD ao entrar no chat e libera os dois ao sair.
6. `useVoiceInput` usa o `RealtimeTranscriber` com `autoSliceOnSpeechEnd: true` e `language: 'pt'`. O `initialPrompt` recebe um vocabulário de gastos, como "reais, centavos, Pix, mercado, farmácia, gasolina", para melhorar o reconhecimento. Ao fim da fala, o texto vai para o mesmo pipeline do chat.
7. Uma frase de gasto é curta. Limitar `maxSlicesInMemory` e `maxResultsInMemory` e chamar `stop` ao terminar cada gravação.
8. VoiceButton com animação em reanimated, reagindo aos eventos do VAD.
9. Testes com Jest usando o mock oficial `whisper.rn/jest-mock`.
10. **Pronto quando:** o gasto falado aparece no ConfirmCard sem internet.

Aceleração: no Android, a NPU Hexagon é usada automaticamente quando `useGpu` está ligado e o chip é compatível. A declaração `libcdsprpc.so` do manifesto serve para o llama.rn e para o whisper.rn. O VAD e o Parakeet rodam sempre na CPU no Android. No iOS, o Core ML acelera o encoder, mas exige baixar e descompactar a pasta `.mlmodelc`. Deixar o Core ML para depois da primeira versão.

Alternativa descartada por ora: o llama.rn aceita áudio em modelos multimodais com `mmproj`. Isso eliminaria o Whisper, mas exige um modelo maior e mais memória. O Whisper continua sendo o caminho mais leve e confiável para transcrição.

## Primeiro passo

Começar pela Fase 0, item 1: novo `src/App.tsx` com os providers e o RootNavigator.
