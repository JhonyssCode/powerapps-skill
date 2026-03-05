import fs from "fs";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import archiver from "archiver";

const EXTENSOES = new Set([".md", ".fx", ".json", ".yaml", ".yml", ".txt", ".py", ".js", ".csv"]);
const PASTAS_EXCLUIR = new Set(["node_modules", ".git", "__pycache__", ".venv", "venv", "exports"]);

function coletarArquivos(pasta) {
  const result = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (PASTAS_EXCLUIR.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && EXTENSOES.has(path.extname(entry.name).toLowerCase())) {
        result.push(full);
      }
    }
  }
  walk(pasta);
  return result;
}

export async function exportarProjeto(opts) {
  const pastaBase = path.resolve(opts.projeto || ".");

  if (!fs.existsSync(pastaBase)) {
    console.error(chalk.red(`❌ Pasta não encontrada: ${pastaBase}`));
    process.exit(1);
  }

  const pastaSaida = path.resolve(opts.saida || "./exports");
  fs.mkdirSync(pastaSaida, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
  const nomeZip = opts.nome
    ? opts.nome.replace(/\.zip$/, "")
    : `${path.basename(pastaBase)}_${timestamp}`;
  const zipPath = path.join(pastaSaida, `${nomeZip}.zip`);

  const arquivos = coletarArquivos(pastaBase);

  if (!arquivos.length) {
    console.log(chalk.yellow("⚠️  Nenhum arquivo elegível encontrado."));
    return;
  }

  const spinner = ora(`Empacotando ${arquivos.length} arquivo(s)...`).start();

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    for (const arq of arquivos) {
      const arcName = path.relative(pastaBase, arq);
      archive.file(arq, { name: arcName });
    }

    archive.finalize();
  });

  const zipSize = fs.statSync(zipPath).size;
  const zipKB = (zipSize / 1024).toFixed(1);

  spinner.succeed(chalk.green(`Pacote criado: ${zipPath}`));

  console.log(`\n${chalk.bold("📦 Conteúdo:")}`);

  // Agrupar por extensão
  const porExt = {};
  for (const arq of arquivos) {
    const ext = path.extname(arq).toLowerCase() || "(sem ext)";
    porExt[ext] = (porExt[ext] || 0) + 1;
  }
  for (const [ext, count] of Object.entries(porExt).sort()) {
    console.log(`   ${chalk.cyan(ext.padEnd(8))} ${count} arquivo(s)`);
  }

  console.log(`\n   ${chalk.bold("Total:")} ${arquivos.length} arquivos  |  ${chalk.bold("Tamanho:")} ${zipKB} KB`);
  console.log(`\n${chalk.green("✅ Pronto para entrega!")}\n`);
}
