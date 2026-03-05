import fs from "fs";
import path from "path";
import chalk from "chalk";

const REGRAS = [
  {
    codigo: "PA001", nivel: "aviso",
    padrao: /\b(Button|Label|TextInput|Gallery|Icon|Image|Rectangle|Toggle|Checkbox|Dropdown|ComboBox|Timer|Screen)\d+\b/,
    mensagem: "Controle com nome padrão. Renomeie com prefixo descritivo (ex: btnSalvar, lblTitulo).",
  },
  {
    codigo: "PA002", nivel: "aviso",
    padrao: /\bRemove\s*\(/,
    mensagem: "Uso de Remove(). Prefira soft delete: Patch(..., {Ativo: false}).",
  },
  {
    codigo: "PA003", nivel: "erro",
    padrao: /\b(Patch|SubmitForm|Remove|RemoveIf|Collect|ClearCollect)\s*\(/,
    mensagem: "Operação de dados sem IfError(). Sempre trate erros em operações de escrita.",
    excecao: /IfError\s*\(/,
    contextLines: 5,
  },
  {
    codigo: "PA004", nivel: "aviso",
    padrao: /\bRGBA\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+/,
    mensagem: "Cor RGBA hardcoded. Use variável de tema: ColorValue(gTheme.Primary).",
  },
  {
    codigo: "PA005", nivel: "aviso",
    padrao: /Filter\s*\(.*?\b(Len|Mid|Left|Right|Upper|Lower|Trim|Concatenate)\s*\(/,
    mensagem: "Função não-delegável dentro de Filter(). Pode limitar a 500/2000 registros.",
  },
  {
    codigo: "PA006", nivel: "info",
    padrao: /\bSet\s*\(\s*(?!(g|l|col)[A-Z])([a-zA-Z_]\w*)\s*,/,
    mensagem: "Variável sem prefixo. Use: g (global), l (local), col (coleção).",
  },
  {
    codigo: "PA007", nivel: "aviso",
    padrao: /\bNavigate\s*\(\s*\w+\s*\)/,
    mensagem: "Navigate() sem ScreenTransition. Use: Navigate(Tela, ScreenTransition.Fade).",
  },
  {
    codigo: "PA008", nivel: "info",
    padrao: /"#[0-9A-Fa-f]{3,6}"/,
    mensagem: "Cor hex hardcoded. Use variável de tema.",
  },
];

function coletarArquivos(pasta, extensoes) {
  const result = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !["node_modules", ".git", "__pycache__"].includes(entry.name)) {
        walk(full);
      } else if (entry.isFile() && extensoes.some((e) => entry.name.endsWith(e))) {
        result.push(full);
      }
    }
  }
  walk(pasta);
  return result;
}

function validarArquivo(filePath, verbose) {
  const conteudo = fs.readFileSync(filePath, "utf-8");
  const linhas = conteudo.split("\n");
  const problemas = [];

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (linha.startsWith("//")) continue;

    for (const regra of REGRAS) {
      if (!regra.padrao.test(linha)) continue;

      // Verifica contexto para regras com exceção
      if (regra.excecao) {
        const start = Math.max(0, i - (regra.contextLines || 3));
        const end = Math.min(linhas.length, i + 3);
        const ctx = linhas.slice(start, end).join("\n");
        if (regra.excecao.test(ctx)) continue;
      }

      problemas.push({
        linha: i + 1,
        nivel: regra.nivel,
        codigo: regra.codigo,
        mensagem: regra.mensagem,
        trecho: linha.slice(0, 120),
      });
    }
  }

  // Arquivo longo sem comentários
  const comentarios = linhas.filter((l) => l.trim().startsWith("//")).length;
  if (linhas.length > 50 && comentarios < 3) {
    problemas.push({
      linha: 0,
      nivel: "info",
      codigo: "PA009",
      mensagem: `Arquivo com ${linhas.length} linhas e apenas ${comentarios} comentários. Documente melhor.`,
      trecho: "",
    });
  }

  return problemas;
}

export async function validarFormulas(opts) {
  const extensoes = [".fx", ".yaml"];
  let arquivos = [];

  if (opts.arquivo) {
    if (!fs.existsSync(opts.arquivo)) {
      console.error(chalk.red(`❌ Arquivo não encontrado: ${opts.arquivo}`));
      process.exit(1);
    }
    arquivos = [opts.arquivo];
  } else if (opts.pasta) {
    if (!fs.existsSync(opts.pasta)) {
      console.error(chalk.red(`❌ Pasta não encontrada: ${opts.pasta}`));
      process.exit(1);
    }
    arquivos = coletarArquivos(opts.pasta, extensoes);
  } else {
    console.error(chalk.red("❌ Use --pasta <pasta> ou --arquivo <arquivo>"));
    process.exit(1);
  }

  if (!arquivos.length) {
    console.log(chalk.yellow("⚠️  Nenhum arquivo .fx ou .yaml encontrado."));
    return;
  }

  console.log(chalk.bold(`\n🔍 Validando ${arquivos.length} arquivo(s)...\n`));

  let totalErros = 0, totalAvisos = 0, totalInfos = 0;

  for (const arq of arquivos) {
    let problemas = validarArquivo(arq, opts.verbose);

    if (opts.apenasErros) {
      problemas = problemas.filter((p) => p.nivel === "erro");
    }

    const erros = problemas.filter((p) => p.nivel === "erro").length;
    const avisos = problemas.filter((p) => p.nivel === "aviso").length;
    const infos = problemas.filter((p) => p.nivel === "info").length;

    totalErros += erros;
    totalAvisos += avisos;
    totalInfos += infos;

    const relativo = path.relative(process.cwd(), arq);

    if (!problemas.length) {
      console.log(`${chalk.green("✅")} ${chalk.gray(relativo)}`);
      continue;
    }

    console.log(`\n📄 ${chalk.bold(relativo)}`);

    for (const p of problemas) {
      const icone = p.nivel === "erro" ? chalk.red("❌") : p.nivel === "aviso" ? chalk.yellow("⚠️ ") : chalk.blue("ℹ️ ");
      const loc = p.linha > 0 ? chalk.gray(`linha ${p.linha}`) : chalk.gray("geral");
      console.log(`   ${icone} ${chalk.bold(`[${p.codigo}]`)} ${loc}`);
      console.log(`      ${p.mensagem}`);
      if (opts.verbose && p.trecho) {
        console.log(`      ${chalk.gray(">")} ${chalk.italic(p.trecho)}`);
      }
    }
  }

  console.log("\n" + "─".repeat(50));
  console.log(chalk.bold("Resultado:"));
  console.log(`  ${chalk.red("❌ Erros:")}  ${totalErros}`);
  console.log(`  ${chalk.yellow("⚠️  Avisos:")} ${totalAvisos}`);
  console.log(`  ${chalk.blue("ℹ️  Infos:")}  ${totalInfos}`);

  if (totalErros === 0 && totalAvisos === 0) {
    console.log(`\n${chalk.green("✅ Tudo ok!")}\n`);
  } else if (totalErros > 0) {
    console.log(`\n${chalk.red("❌ Falhou — corrija os erros antes de publicar.\n")}`);
    process.exit(1);
  } else {
    console.log(`\n${chalk.yellow("⚠️  Aprovado com avisos.\n")}`);
  }
}
