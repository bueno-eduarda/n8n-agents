# Multi-Agent System for n8n Workflow Generation

Sistema multi-agente que transforma linguagem natural em workflows n8n completos e validados.

## O Problema

Criar workflows n8n para integracoes complexas (ex: sincronizacao bidirecional entre sistemas) envolve muitas decisoes tecnicas: estrutura de nodes, mapeamentos, anti-loops, seguranca, idempotencia. Fazer isso manualmente e lento e propenso a erros.

## A Solucao

Um orquestrador que coordena **11 agentes especializados**, cada um com responsabilidade unica, para gerar workflows n8n prontos para importar.

## Arquitetura

```
Descricao em linguagem natural
          |
          v
   +--------------+
   | Orchestrator  |  Coordena todo o fluxo
   +--------------+
          |
          v
   +-- CORE AGENTS --------+
   |                        |
   |  Specifier  ---------> |  Transforma descricao informal em SPEC estruturada
   |  Architect  ---------> |  Define arquitetura tecnica (nodes, ordem, estrategia de erro)
   |  Builder    ---------> |  Gera o JSON importavel do n8n
   |                        |
   +------------------------+
          |
          v
   +-- QUALITY AGENTS -----+
   |                        |
   |  Validator  ---------> |  Valida contra Definition of Done
   |  Tester     ---------> |  Testa com payloads simulados (happy path, erros, edge cases)
   |  Security   ---------> |  Garante ausencia de secrets hardcoded
   |  Idempotency --------> |  Evita duplicacoes em reprocessamento
   |  Observability ------> |  Garante rastreabilidade e logging
   |                        |
   +------------------------+
          |
          v
   +-- SPECIALIST AGENTS ---+
   |                        |
   |  Mapping    ---------> |  Valida mapeamentos entre sistemas
   |  (Domain specialists)   |  Validam conformidade com APIs especificas
   |                        |
   +------------------------+
          |
          v
   Workflow JSON pronto para importar no n8n
```

## Principios de Design

### Separacao de Responsabilidades
Cada agente tem uma missao unica e **restricoes explicitas** do que NAO pode fazer:

| Agente | Pode | Nao Pode |
|--------|------|----------|
| Specifier | Estruturar requisitos | Gerar JSON, decidir arquitetura |
| Architect | Definir estrutura tecnica | Gerar JSON, alterar requisitos |
| Builder | Gerar JSON | Alterar arquitetura ou requisitos |
| Validator | Reportar problemas | Modificar o workflow |
| Tester | Testar e reportar | Modificar workflow ou SPEC |

### Pipeline Sequencial com Especialistas sob Demanda
Os agentes core e quality executam em sequencia fixa. Os specialists sao consultados quando o dominio exige.

### Definition of Done como Contrato
Cada workflow gerado e validado contra criterios objetivos:
- Nodes com nomes descritivos e padronizados
- Zero secrets hardcoded
- Mapeamentos isolados em Code Nodes com validacao
- Sem nodes orfaos
- Headers HTTP corretos por servico
- Testes passando para happy path e cenarios de erro

## Estrutura do Projeto

```
src/
  orchestrator/    # Orquestrador principal
    index.js
  agents/
    core/          # Agentes principais do pipeline
      specifier.js # Linguagem natural -> SPEC estruturada
      architect.js # SPEC -> Arquitetura tecnica
      builder.js   # Arquitetura -> JSON n8n
    quality/       # Agentes de qualidade (automaticos)
      validator.js
      tester.js
      security.js
      idempotency.js
      observability.js
    specialists/   # Agentes de dominio (sob demanda)
      mapping.js
```

## Exemplo de Uso

```javascript
const WorkflowOrchestrator = require('./src/orchestrator');

const orchestrator = new WorkflowOrchestrator();

// Descreva o que voce precisa em linguagem natural
const result = await orchestrator.generate(
  "Quando um ticket for criado no sistema de suporte, " +
  "criar automaticamente um work item no sistema de projetos " +
  "com os campos mapeados corretamente"
);

// result.workflow -> JSON pronto para importar no n8n
// result.validation -> Relatorio de validacao
// result.tests -> Resultados dos testes
```

## Fluxo Detalhado

### 1. Specifier Agent
Recebe: `"Sincronizar tickets entre suporte e projetos"`

Produz:
```json
{
  "objetivo": "Criar work item quando ticket e criado",
  "trigger": "Webhook - evento de criacao",
  "integracoes": ["Sistema de Suporte", "Sistema de Projetos"],
  "campos_obrigatorios": ["titulo", "descricao", "estado", "prioridade"],
  "mapeamentos": { "estados": "suporte -> projetos" },
  "cenarios_erro": ["campo ausente", "estado nao mapeado"],
  "definition_of_done": ["nodes nomeados", "mapeamentos validados", "sem secrets"]
}
```

### 2. Architect Agent
Recebe a SPEC e define:
```
Webhook (receber evento)
  -> Extract Fields (extrair campos do payload)
    -> Code (mapear estados)
      -> Validate (verificar campos obrigatorios)
        -> HTTP Request (criar item no destino)
```

### 3. Builder Agent
Gera o JSON n8n completo com nodes, connections, posicionamento e credenciais referenciadas.

### 4. Quality Pipeline
- **Validator**: Verifica naming, credentials, connections
- **Tester**: Simula payloads (happy path + erros)
- **Security**: Busca secrets expostos
- **Idempotency**: Verifica reprocessamento seguro
- **Observability**: Verifica logging adequado

## Convencoes Enforced

O sistema garante automaticamente:

```javascript
// Nomeacao padronizada de nodes
"Webhook (Origem)"
"Extract Fields"
"Code (Map State)"
"HTTP Request (Servico - acao)"

// Mapeamentos sempre com validacao
if (!valorMapeado) {
  throw new Error("Valor nao mapeado: " + original);
}

// Headers corretos por servico
// Content-Type: application/json-patch+json para PATCH
// Content-Type: application/json para POST/PUT
```

## Tech Stack

- **n8n** - Plataforma de automacao
- **Node.js** - Runtime dos agentes
- **Multi-Agent Architecture** - 11 agentes especializados com responsabilidades isoladas

## Licenca

MIT
# n8n-agents
