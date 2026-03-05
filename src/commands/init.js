import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

const TELAS_CRUD = (entidade) => [
  `HomeScreen`,
  `${entidade}ListScreen`,
  `${entidade}DetailScreen`,
  `${entidade}FormScreen`,
];

function slugify(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function escrever(filePath, conteudo) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, conteudo, "utf-8");
}

async function perguntar(opts) {
  const respostas = {};

  if (!opts.nome) {
    const r = await inquirer.prompt([
      { type: "input", name: "nome", message: "Nome do projeto:", default: "MeuAppPowerApps" },
    ]);
    respostas.nome = r.nome;
  } else {
    respostas.nome = opts.nome;
  }

  const r2 = await inquirer.prompt([
    {
      type: "list",
      name: "source",
      message: "Fonte de dados principal:",
      choices: [
        { name: "SharePoint (incluso no M365, ideal para apps simples)", value: "sharepoint" },
        { name: "Dataverse (requer licença Premium, ideal para apps corporativos)", value: "dataverse" },
        { name: "SQL Server (dados existentes em banco relacional)", value: "sql" },
      ],
      default: opts.source || "sharepoint",
    },
    {
      type: "list",
      name: "device",
      message: "Dispositivo alvo:",
      choices: [
        { name: "Desktop + Mobile (responsivo)", value: "both" },
        { name: "Apenas Desktop (tablet 16:9)", value: "desktop" },
        { name: "Apenas Mobile (phone)", value: "mobile" },
      ],
      default: opts.device || "both",
    },
    {
      type: "input",
      name: "entidade",
      message: "Nome da entidade principal (ex: Tarefa, Projeto, Pedido):",
      default: "Registro",
    },
    {
      type: "input",
      name: "descricao",
      message: "Descrição do app em uma frase:",
      default: "App de gestão de " + (opts.nome || "dados"),
    },
  ]);

  return { ...respostas, ...r2 };
}

export async function initProjeto(opts) {
  const config = await perguntar(opts);
  const { nome, source, device, entidade, descricao } = config;
  const slug = slugify(nome);
  const base = path.resolve(slug);

  if (fs.existsSync(base)) {
    console.log(chalk.red(`\n❌ Pasta "${slug}" já existe. Escolha outro nome.\n`));
    process.exit(1);
  }

  const spinner = ora(`Criando projeto "${nome}"...`).start();

  // ── README ──────────────────────────────────────────────
  escrever(
    `${base}/README.md`,
    `# ${nome}

${descricao}

## Sobre o App

| Campo | Valor |
|-------|-------|
| Tipo | Canvas App (Power Apps) |
| Fonte de dados | ${source} |
| Dispositivo | ${device} |
| Entidade principal | ${entidade} |

## Estrutura do Projeto

\`\`\`
${slug}/
├── docs/
│   ├── requisitos.md        ← Requisitos e histórias de usuário
│   ├── modelo-dados.md      ← Tabelas, colunas e relações
│   └── mapa-telas.md        ← Diagrama de navegação
├── formulas/
│   ├── App.OnStart.fx       ← Inicialização global
${TELAS_CRUD(entidade).map((t) => `│   ├── ${t}.fx`).join("\n")}
├── assets/
│   └── tema.json            ← Cores e tipografia do app
└── README.md
\`\`\`

## Setup

1. Acesse [make.powerapps.com](https://make.powerapps.com)
2. Crie uma **Solução** nova: \`${nome}\`
3. Dentro da solução, crie um **Canvas App** em branco
4. Configure a fonte de dados: **${source}**
5. Importe as fórmulas dos arquivos \`.fx\` conforme o guia em \`docs/\`

## Comandos Úteis

\`\`\`bash
# Gerar documentação do modelo de dados
npx powerapps-skill gerar-modelo --config assets/modelo.json

# Validar fórmulas
npx powerapps-skill validar --pasta formulas --verbose

# Empacotar para entrega
npx powerapps-skill exportar --projeto .
\`\`\`
`
  );

  // ── REQUISITOS ───────────────────────────────────────────
  escrever(
    `${base}/docs/requisitos.md`,
    `# Requisitos — ${nome}

## Visão Geral
- **Objetivo**: ${descricao}
- **Usuários**: [Descreva os usuários]
- **Dispositivo principal**: ${device}
- **Fonte de dados**: ${source}

## Histórias de Usuário

| ID | Como... | Quero... | Para... | Prioridade |
|----|---------|----------|---------|------------|
| US-01 | usuário | ver lista de ${entidade.toLowerCase()}s | acompanhar o status | Alta |
| US-02 | usuário | criar um novo ${entidade.toLowerCase()} | registrar informações | Alta |
| US-03 | usuário | editar um ${entidade.toLowerCase()} existente | corrigir informações | Alta |
| US-04 | usuário | arquivar um ${entidade.toLowerCase()} | manter o histórico | Média |
| US-05 | gestor | filtrar por status | focar no que importa | Média |

## Critérios de Aceitação
- [ ] App carrega em menos de 3 segundos
- [ ] Funciona em ${device === "both" ? "mobile e desktop" : device}
- [ ] Apenas usuários autenticados acessam o app
- [ ] Campos obrigatórios validados antes de salvar
- [ ] Mensagens de erro e sucesso claras

## Fora do Escopo (v1)
- [ ] Notificações por e-mail (Power Automate — v2)
- [ ] Relatórios avançados (v2)
- [ ] Integração com sistemas externos (v2)
`
  );

  // ── MAPA DE TELAS ────────────────────────────────────────
  const telas = TELAS_CRUD(entidade);
  escrever(
    `${base}/docs/mapa-telas.md`,
    `# Mapa de Telas — ${nome}

## Diagrama de Navegação

\`\`\`
SplashScreen (carregamento)
    ↓
HomeScreen (dashboard)
    ↓
${entidade}ListScreen (lista com busca e filtro)
    ↓                    ↓
${entidade}DetailScreen   ${entidade}FormScreen (novo/editar)
    ↓
${entidade}FormScreen (editar)
\`\`\`

## Descrição das Telas

${telas
  .map(
    (tela, i) => `### ${i + 1}. ${tela}
- **Propósito**: ${
      tela === "HomeScreen"
        ? "Dashboard com resumo e menu de navegação"
        : tela.includes("List")
        ? `Galeria de ${entidade.toLowerCase()}s com busca, filtro e botão Novo`
        : tela.includes("Detail")
        ? `Exibir detalhes de um ${entidade.toLowerCase()} selecionado`
        : `Formulário para criar ou editar um ${entidade.toLowerCase()}`
    }
- **Controles principais**: [descreva os controles]
- **Navega para**: [próximas telas]
`
  )
  .join("\n")}
`
  );

  // ── MODELO DE DADOS ──────────────────────────────────────
  escrever(
    `${base}/docs/modelo-dados.md`,
    `# Modelo de Dados — ${nome}

> Fonte de dados: **${source}**

## Tabela: ${entidade}s

| Coluna | Tipo | Obrigatório | Descrição | Valores |
|--------|------|:-----------:|-----------|---------|
| Title | Text | ✅ | Nome do ${entidade.toLowerCase()} | — |
| Status | Choice | ✅ | Estado atual | Pendente, Em Andamento, Concluído, Cancelado |
| Responsavel | Person | ✅ | Responsável | Usuários do tenant |
| DataPrazo | DateTime | — | Data limite | — |
| Descricao | Text | — | Detalhes | — |
| Ativo | Boolean | ✅ | Soft delete (true = ativo) | — |

## Diagrama

\`\`\`
[${entidade}s] — tabela principal
\`\`\`

> Adicione relações conforme o projeto evoluir.
`
  );

  // ── FÓRMULAS ─────────────────────────────────────────────
  escrever(
    `${base}/formulas/App.OnStart.fx`,
    `// ============================================================
// App.OnStart — ${nome}
// Inicialização global: tema, usuário e dados
// ============================================================

Concurrent(
    // Tema
    Set(
        gTheme,
        {
            Primary:       "#0078D4",
            PrimaryDark:   "#005A9E",
            Background:    "#F3F2F1",
            Surface:       "#FFFFFF",
            TextPrimary:   "#323130",
            TextSecondary: "#605E5C",
            Error:         "#A4262C",
            Success:       "#107C10",
            Border:        "#EDEBE9"
        }
    ),

    // Usuário atual
    Set(gCurrentUser, Office365Users.MyProfileV2()),

    // Dados principais
    ClearCollect(col${entidade}s, Filter(${entidade}s, Ativo = true)),

    // Listas de apoio
    ClearCollect(
        colStatusOptions,
        {Value: "Pendente"},
        {Value: "Em Andamento"},
        {Value: "Concluído"},
        {Value: "Cancelado"}
    ),

    // Estado inicial da UI
    Set(gSelectedRecord, Blank()),
    Set(gIsNewRecord, false),
    Set(gIsLoading, false)
)
`
  );

  for (const tela of telas) {
    let conteudo = `// ============================================================\n// ${tela}\n// ============================================================\n\n`;

    if (tela === "HomeScreen") {
      conteudo += `// OnVisible — atualiza contadores ao entrar na tela\nOnVisible:
ClearCollect(col${entidade}s, Filter(${entidade}s, Ativo = true))

// Exemplos de fórmulas para cards de resumo:
// lblTotalCount.Text  = Text(CountRows(col${entidade}s))
// lblPendingCount.Text = Text(CountIf(col${entidade}s, Status = "Pendente"))
// lblDoneCount.Text   = Text(CountIf(col${entidade}s, Status = "Concluído"))
`;
    } else if (tela.includes("List")) {
      conteudo += `// Items da galeria — busca + filtro por status
gal${entidade}s.Items:
Filter(
    col${entidade}s,
    Ativo = true
    && (
        IsBlank(txtBusca.Text)
        || Title in txtBusca.Text
    )
    && (
        drpFiltroStatus.Selected.Value = "Todos"
        || Status = drpFiltroStatus.Selected.Value
    )
)

// Botão Novo
btnNovo.OnSelect:
Set(gIsNewRecord, true);
Set(gSelectedRecord, Blank());
Navigate(${entidade}FormScreen, ScreenTransition.Fade)

// Tap na galeria → Detalhe
gal${entidade}s.OnSelect:
Set(gSelectedRecord, ThisItem);
Navigate(${entidade}DetailScreen, ScreenTransition.Fade)
`;
    } else if (tela.includes("Detail")) {
      conteudo += `// Botão Editar
btnEditar.OnSelect:
Set(gIsNewRecord, false);
Navigate(${entidade}FormScreen, ScreenTransition.Fade)

// Botão Arquivar (soft delete)
btnArquivar.OnSelect:
IfError(
    Patch(${entidade}s, gSelectedRecord, {Ativo: false}),
    Notify("Erro ao arquivar: " & FirstError.Message, NotificationType.Error),
    Notify("Arquivado com sucesso.", NotificationType.Success);
    ClearCollect(col${entidade}s, Filter(${entidade}s, Ativo = true));
    Navigate(${entidade}ListScreen, ScreenTransition.Back)
)

// Botão Voltar
btnVoltar.OnSelect:
Navigate(${entidade}ListScreen, ScreenTransition.Back)
`;
    } else if (tela.includes("Form")) {
      conteudo += `// Botão Salvar
btnSalvar.OnSelect:
If(
    IsBlank(txtTitulo.Text),
    Notify("Título é obrigatório.", NotificationType.Error),

    IfError(
        Patch(
            ${entidade}s,
            If(gIsNewRecord, Defaults(${entidade}s), gSelectedRecord),
            {
                Title:       txtTitulo.Text,
                Status:      drpStatus.Selected.Value,
                DataPrazo:   dpkDataPrazo.SelectedDate,
                Responsavel: {
                    '@odata.type': "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedUser",
                    Claims:       "i:0#.f|membership|" & pepResponsavel.Selected.Email,
                    DisplayName:  pepResponsavel.Selected.DisplayName,
                    Email:        pepResponsavel.Selected.Email,
                    Picture:      ""
                },
                Ativo: true
            }
        ),
        Notify("Erro ao salvar: " & FirstError.Message, NotificationType.Error),
        Notify(
            If(gIsNewRecord, "Criado com sucesso!", "Atualizado com sucesso!"),
            NotificationType.Success
        );
        ClearCollect(col${entidade}s, Filter(${entidade}s, Ativo = true));
        Navigate(${entidade}ListScreen, ScreenTransition.Back)
    )
)

// Botão Cancelar
btnCancelar.OnSelect:
Navigate(${entidade}ListScreen, ScreenTransition.Back)
`;
    }

    escrever(`${base}/formulas/${tela}.fx`, conteudo);
  }

  // ── TEMA ─────────────────────────────────────────────────
  escrever(
    `${base}/assets/tema.json`,
    JSON.stringify(
      {
        app_name: nome,
        colors: {
          Primary: "#0078D4",
          PrimaryDark: "#005A9E",
          Background: "#F3F2F1",
          Surface: "#FFFFFF",
          TextPrimary: "#323130",
          TextSecondary: "#605E5C",
          Error: "#A4262C",
          Success: "#107C10",
          Border: "#EDEBE9",
        },
        typography: {
          FontFamily: "Segoe UI",
          TitleSize: 28,
          BodySize: 14,
        },
        dimensions: {
          HeaderHeight: 60,
          ButtonHeight: 40,
          SidebarWidth: 220,
        },
      },
      null,
      2
    )
  );

  spinner.succeed(chalk.green(`Projeto criado com sucesso!`));

  console.log(`
${chalk.bold("📁 Estrutura gerada:")}
${chalk.cyan(slug)}/
├── ${chalk.yellow("README.md")}
├── docs/
│   ├── requisitos.md
│   ├── modelo-dados.md
│   └── mapa-telas.md
├── formulas/
│   ├── App.OnStart.fx
${telas.map((t) => `│   ├── ${t}.fx`).join("\n")}
└── assets/
    └── tema.json

${chalk.bold("🚀 Próximos passos:")}
  ${chalk.gray("1.")} cd ${slug}
  ${chalk.gray("2.")} Revise ${chalk.cyan("docs/requisitos.md")} e ${chalk.cyan("docs/modelo-dados.md")}
  ${chalk.gray("3.")} Crie as tabelas no ${source} conforme o modelo
  ${chalk.gray("4.")} Cole as fórmulas de ${chalk.cyan("formulas/")} no Power Apps Studio
  ${chalk.gray("5.")} npx powerapps-skill validar --pasta formulas
`);
}
