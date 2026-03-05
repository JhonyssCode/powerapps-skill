import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

function escrever(filePath, conteudo) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, conteudo, "utf-8");
}

async function coletarInterativo() {
  const { appName, dataSource } = await inquirer.prompt([
    { type: "input", name: "appName", message: "Nome do App:", default: "Meu App" },
    {
      type: "list",
      name: "dataSource",
      message: "Fonte de dados:",
      choices: ["SharePoint", "Dataverse", "SQL Server"],
    },
  ]);

  const tables = [];

  while (true) {
    const { tableName } = await inquirer.prompt([
      {
        type: "input",
        name: "tableName",
        message: `\nNome da tabela ${tables.length + 1} (ENTER para finalizar):`,
      },
    ]);
    if (!tableName.trim()) break;

    const { tableDesc } = await inquirer.prompt([
      { type: "input", name: "tableDesc", message: "Descrição:", default: "" },
    ]);

    const columns = [];
    console.log(chalk.gray("  Adicione as colunas (ENTER no nome para finalizar):"));

    while (true) {
      const { colName } = await inquirer.prompt([
        { type: "input", name: "colName", message: "  Nome da coluna:" },
      ]);
      if (!colName.trim()) break;

      const { colType, required, description } = await inquirer.prompt([
        {
          type: "list",
          name: "colType",
          message: "  Tipo:",
          choices: ["Text", "Number", "DateTime", "Boolean", "Choice", "Person", "Lookup", "Currency", "Attachment"],
        },
        { type: "confirm", name: "required", message: "  Obrigatório?", default: false },
        { type: "input", name: "description", message: "  Descrição:", default: "" },
      ]);

      let values = null;
      if (colType === "Choice") {
        const { raw } = await inquirer.prompt([
          { type: "input", name: "raw", message: "  Valores (separados por vírgula):" },
        ]);
        values = raw.split(",").map((v) => v.trim()).filter(Boolean);
      }

      columns.push({ name: colName, type: colType, required, description, values });
    }

    tables.push({ name: tableName, description: tableDesc, columns, relationships: [] });
  }

  return { app_name: appName, data_source: dataSource, tables };
}

function gerarMarkdown(modelo) {
  const agora = new Date().toLocaleString("pt-BR");
  const linhas = [];

  linhas.push(`# Modelo de Dados — ${modelo.app_name || "Power Apps"}`);
  linhas.push(`\n> Gerado em ${agora}  `);
  linhas.push(`> Fonte de dados: **${modelo.data_source || "Não especificada"}**\n`);
  linhas.push("---\n");
  linhas.push("## Índice\n");

  for (const t of modelo.tables || []) {
    linhas.push(`- [${t.name}](#${t.name.toLowerCase().replace(/\s+/g, "-")})`);
  }

  linhas.push("\n---\n");

  for (const table of modelo.tables || []) {
    linhas.push(`## ${table.name}\n`);
    if (table.description) linhas.push(`**Descrição**: ${table.description}\n`);

    if (table.columns?.length) {
      linhas.push("### Colunas\n");
      linhas.push("| Coluna | Tipo | Obrigatório | Descrição | Valores |");
      linhas.push("|--------|------|:-----------:|-----------|---------|");
      for (const col of table.columns) {
        const req = col.required ? "✅" : "—";
        const vals = col.values?.join(", ") || "—";
        linhas.push(`| ${col.name} | ${col.type} | ${req} | ${col.description || ""} | ${vals} |`);
      }
    }

    if (table.relationships?.length) {
      linhas.push("\n### Relações\n");
      for (const rel of table.relationships) {
        linhas.push(`- **${rel.type}** com \`${rel.target_table}\`: ${rel.description || ""}`);
      }
    }

    linhas.push("\n---\n");
  }

  // Fórmulas geradas
  linhas.push("## Fórmulas Power Fx\n\n### OnStart — Carregar coleções\n\n```powerfx");
  linhas.push("Concurrent(");
  (modelo.tables || []).forEach((t, i) => {
    const virgula = i < modelo.tables.length - 1 ? "," : "";
    linhas.push(`    ClearCollect(col${t.name}, ${t.name})${virgula}`);
  });
  linhas.push(")");
  linhas.push("```\n");

  return linhas.join("\n");
}

export async function gerarModelo(opts) {
  let modelo;

  if (opts.interativo) {
    modelo = await coletarInterativo();
  } else if (opts.config) {
    if (!fs.existsSync(opts.config)) {
      console.error(chalk.red(`❌ Arquivo não encontrado: ${opts.config}`));
      process.exit(1);
    }
    modelo = JSON.parse(fs.readFileSync(opts.config, "utf-8"));
  } else {
    console.error(chalk.red("❌ Use --config <arquivo.json> ou --interativo"));
    process.exit(1);
  }

  const spinner = ora("Gerando documentação do modelo de dados...").start();

  const markdown = gerarMarkdown(modelo);
  escrever(opts.output, markdown);

  spinner.succeed(chalk.green(`Modelo gerado: ${opts.output}`));
  console.log(chalk.gray(`   Tabelas: ${modelo.tables?.length || 0}`));
  const totalCols = (modelo.tables || []).reduce((s, t) => s + (t.columns?.length || 0), 0);
  console.log(chalk.gray(`   Colunas: ${totalCols}`));
}
