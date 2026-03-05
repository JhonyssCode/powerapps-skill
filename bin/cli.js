#!/usr/bin/env node
import { program } from "commander";
import chalk from "chalk";
import { gerarModelo } from "../src/commands/gerar-modelo.js";
import { validarFormulas } from "../src/commands/validar-formulas.js";
import { exportarProjeto } from "../src/commands/exportar-projeto.js";
import { initProjeto } from "../src/commands/init.js";

const ASCII = `
 ____                          _                         
|  _ \\ _____      _____ _ __  / \\   _ __  _ __  ___   
| |_) / _ \\ \\ /\\ / / _ \\ '__| / _ \\ | '_ \\| '_ \\/ __|  
|  __/ (_) \\ V  V /  __/ |   / ___ \\| |_) | |_) \\__ \\  
|_|   \\___/ \\_/\\_/ \\___|_|  /_/   \\_\\ .__/| .__/|___/  
                                      |_|   |_|          
`;

console.log(chalk.blue(ASCII));
console.log(chalk.gray("  Gerador de projetos Power Apps (Canvas Apps)\n"));

program
  .name("powerapps-skill")
  .description("CLI para scaffolding e utilitários de projetos Power Apps")
  .version("1.0.0");

program
  .command("init")
  .description("Inicializa um novo projeto Power Apps com estrutura completa")
  .option("-n, --nome <nome>", "Nome do projeto")
  .option("-s, --source <tipo>", "Fonte de dados: sharepoint | dataverse | sql", "sharepoint")
  .option("-d, --device <tipo>", "Dispositivo alvo: desktop | mobile | both", "both")
  .action(initProjeto);

program
  .command("gerar-modelo")
  .description("Gera documentação Markdown do modelo de dados")
  .option("-c, --config <arquivo>", "JSON com definição do modelo de dados")
  .option("-o, --output <arquivo>", "Arquivo de saída (.md)", "docs/modelo-dados.md")
  .option("-i, --interativo", "Modo interativo (pergunta as informações)")
  .action(gerarModelo);

program
  .command("validar")
  .description("Valida fórmulas Power Fx em busca de anti-padrões")
  .option("-p, --pasta <pasta>", "Pasta para escanear recursivamente")
  .option("-a, --arquivo <arquivo>", "Arquivo específico para validar")
  .option("-v, --verbose", "Mostrar trecho do código com o problema")
  .option("--apenas-erros", "Mostrar apenas erros, ignorar avisos")
  .action(validarFormulas);

program
  .command("exportar")
  .description("Empacota o projeto em um .zip pronto para entrega")
  .option("-p, --projeto <pasta>", "Pasta do projeto", ".")
  .option("-o, --saida <pasta>", "Pasta de saída", "./exports")
  .option("-n, --nome <nome>", "Nome do arquivo zip")
  .action(exportarProjeto);

program.parse();
