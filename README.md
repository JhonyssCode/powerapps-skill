# powerapps-skill

> CLI para scaffolding e utilitários de projetos **Microsoft Power Apps (Canvas Apps)**

## Uso via npx (sem instalação)

```bash
# Criar novo projeto completo (interativo)
npx powerapps-skill init

# Criar projeto passando opções direto
npx powerapps-skill init --nome "Gestão de Tarefas" --source sharepoint

# Gerar documentação do modelo de dados
npx powerapps-skill gerar-modelo --config modelo.json

# Gerar modelo em modo interativo
npx powerapps-skill gerar-modelo --interativo

# Validar fórmulas Power Fx
npx powerapps-skill validar --pasta ./formulas --verbose

# Empacotar projeto para entrega
npx powerapps-skill exportar --projeto . --saida ./exports
```

## Instalação global (opcional)

```bash
npm install -g powerapps-skill
powerapps-skill init
```

---

## Comandos

### `init` — Scaffolding completo do projeto

Cria toda a estrutura de pastas, documentação e fórmulas iniciais.

```bash
npx powerapps-skill init [opções]

Opções:
  -n, --nome <nome>       Nome do projeto
  -s, --source <tipo>     Fonte de dados: sharepoint | dataverse | sql
  -d, --device <tipo>     Dispositivo: desktop | mobile | both
```

**Estrutura gerada:**
```
meu-app/
├── README.md
├── docs/
│   ├── requisitos.md
│   ├── modelo-dados.md
│   └── mapa-telas.md
├── formulas/
│   ├── App.OnStart.fx
│   ├── HomeScreen.fx
│   ├── [Entidade]ListScreen.fx
│   ├── [Entidade]DetailScreen.fx
│   └── [Entidade]FormScreen.fx
└── assets/
    └── tema.json
```

---

### `gerar-modelo` — Documentação do modelo de dados

Gera um `.md` completo com tabelas, colunas, relações e fórmulas de carregamento.

```bash
npx powerapps-skill gerar-modelo --config modelo.json --output docs/modelo-dados.md
npx powerapps-skill gerar-modelo --interativo
```

**Formato do `modelo.json`:**
```json
{
  "app_name": "Gestão de Projetos",
  "data_source": "SharePoint",
  "tables": [
    {
      "name": "Projetos",
      "description": "Tabela principal",
      "columns": [
        { "name": "Title",  "type": "Text",   "required": true,  "description": "Nome" },
        { "name": "Status", "type": "Choice", "required": true,  "description": "Estado",
          "values": ["Pendente", "Em Andamento", "Concluído"] }
      ],
      "relationships": [
        { "type": "1:N", "target_table": "Tarefas", "description": "Um projeto tem muitas tarefas" }
      ]
    }
  ]
}
```

---

### `validar` — Análise de fórmulas Power Fx

Detecta anti-padrões em arquivos `.fx` e `.yaml`.

```bash
npx powerapps-skill validar --pasta ./formulas
npx powerapps-skill validar --arquivo ./formulas/HomeScreen.fx --verbose
npx powerapps-skill validar --pasta . --apenas-erros
```

**Regras verificadas:**

| Código | Nível | Descrição |
|--------|-------|-----------|
| PA001 | ⚠️ Aviso | Controle com nome padrão (Button1, Label3...) |
| PA002 | ⚠️ Aviso | Remove() sem soft delete |
| PA003 | ❌ Erro  | Operação de dados sem IfError() |
| PA004 | ⚠️ Aviso | Cor RGBA hardcoded |
| PA005 | ⚠️ Aviso | Função não-delegável dentro de Filter() |
| PA006 | ℹ️ Info  | Variável sem prefixo de convenção |
| PA007 | ⚠️ Aviso | Navigate() sem ScreenTransition |
| PA008 | ℹ️ Info  | Cor hex hardcoded em string |
| PA009 | ℹ️ Info  | Arquivo longo sem comentários |

---

### `exportar` — Empacotar para entrega

```bash
npx powerapps-skill exportar --projeto . --saida ./exports --nome MeuApp_v1
```

---

## Requisitos

- Node.js 18 ou superior

---

## Licença

MIT
