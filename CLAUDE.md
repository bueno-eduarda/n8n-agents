# CLAUDE.md - Multi-Agent System for n8n Workflow Generation

## Projeto

Sistema multi-agente que transforma linguagem natural em workflows n8n completos e validados. Este repositorio e a versao publica (sanitizada) focada apenas na arquitetura de agentes.

**Objetivo**: Servir como portfolio/showcase da arquitetura multi-agente para geracao de workflows n8n.

---

# Visao Geral

| Metrica | Valor |
|---------|-------|
| Total de Agentes | 11 |
| Core Agents | 3 |
| Quality Agents | 5 |
| Specialist Agents | 3 |

## Grupos de Agentes

| Grupo | Agentes | Funcao |
|-------|---------|--------|
| Core | Specifier, Architect, Builder | Pipeline principal de geracao |
| Quality | Validator, Tester, Security, Idempotency, Observability | Validacao automatica |
| Specialists | Mapping, Domain Specialists | Conhecimento de dominio |

---

# Arquitetura

```
Linguagem Natural
       |
       v
  Orchestrator
       |
       +---> Specifier (SPEC estruturada)
       |
       +---> Architect (Arquitetura tecnica)
       |
       +---> Builder (JSON n8n)
       |
       +---> Quality Agents (Validacao paralela)
       |
       v
  Workflow JSON pronto para importar
```

---

# Core Agents

## Specifier Agent

**Arquivo**: `src/agents/core/specifier.js`

### Missao
Transformar solicitacao informal em SPEC estruturada e completa.

### Responsabilidades
- Refinar objetivo
- Identificar trigger correto
- Identificar integracoes envolvidas
- Listar campos obrigatorios
- Identificar mapeamentos necessarios
- Definir criterios de erro
- Definir Definition of Done

### Restricoes
- NAO gerar JSON
- NAO definir estrutura tecnica de nodes
- NAO tomar decisoes arquiteturais

---

## Architect Agent

**Arquivo**: `src/agents/core/architect.js`

### Missao
Definir arquitetura tecnica do workflow antes da geracao do JSON.

### Responsabilidades
- Definir separacao de responsabilidades
- Determinar ordem dos nodes
- Definir pontos de normalizacao e mapeamento
- Definir estrategia de erro

### Restricoes
- NAO gerar JSON final
- NAO alterar requisitos da SPEC

### Node Patterns
```javascript
{
  webhook:   { order: 1, responsibility: 'Receber evento externo' },
  extract:   { order: 2, responsibility: 'Extrair campos do payload' },
  normalize: { order: 3, responsibility: 'Normalizar dados' },
  map:       { order: 4, responsibility: 'Mapear valores entre sistemas' },
  validate:  { order: 5, responsibility: 'Validar campos obrigatorios' },
  http:      { order: 6, responsibility: 'Integracao externa (HTTP Request)' },
  update:    { order: 7, responsibility: 'Atualizacao cruzada (opcional)' }
}
```

---

## Builder Agent

**Arquivo**: `src/agents/core/builder.js`

### Missao
Gerar o JSON importavel do n8n.

### Responsabilidades
- Criar nodes conforme arquitetura
- Aplicar nomeacao padronizada
- Usar credenciais existentes (por referencia)
- Conectar corretamente os nodes
- Garantir JSON valido

### Restricoes
- NAO hardcode de credenciais
- NAO misturar responsabilidades em nodes
- NAO alterar estrutura arquitetural definida

---

# Quality Agents

## Validator Agent

**Arquivo**: `src/agents/quality/validator.js`

### Missao
Garantir que o workflow atende ao Definition of Done.

### Verificacoes
- Separacao de responsabilidades
- Campos obrigatorios
- Ausencia de hardcoded secrets
- Mapeamentos isolados
- Headers HTTP corretos
- Ausencia de nodes orfaos

### Restricoes
- NAO modificar workflow
- Apenas validar e reportar

---

## Tester Agent

**Arquivo**: `src/agents/quality/tester.js`

### Missao
Validar comportamento funcional atraves de testes simulados.

### Tipos de Testes
1. **Happy Path** - Fluxo executa corretamente
2. **Campo Obrigatorio Ausente** - Workflow falha explicitamente
3. **Estado Nao Mapeado** - Erro e lancado
4. **Dados Incompletos** - Workflow nao continua silenciosamente
5. **Reprocessamento** - Nao cria duplicacao

### Restricoes
- NAO modificar workflow
- NAO alterar SPEC
- Apenas testar e reportar

---

## Security Agent

**Arquivo**: `src/agents/quality/security.js`

### Missao
Garantir que nenhum secret esta exposto no workflow.

### Verificacoes
- Tokens hardcoded em headers ou body
- Credenciais inline
- URLs com tokens em query strings

---

## Idempotency Agent

**Arquivo**: `src/agents/quality/idempotency.js`

### Missao
Evitar duplicacoes em reprocessamento.

### Verificacoes
- Operacoes duplicadas ao reprocessar mesmo evento
- Ausencia de chave de deduplicacao quando necessario

---

## Observability Agent

**Arquivo**: `src/agents/quality/observability.js`

### Missao
Garantir rastreabilidade e logging adequado.

### Verificacoes
- Nodes com logging suficiente
- Erros rastreiaveis

---

# Specialist Agents

## Mapping Agent

**Arquivo**: `src/agents/specialists/mapping.js`

### Missao
Validar mapeamentos entre sistemas.

### Verificacoes
- Mapeamentos completos (todos os valores cobertos)
- Validacao de valores nao mapeados (throw error)
- Isolamento em Code Nodes dedicados

---

# Convencoes

## Nomeacao de Nodes

```
"Webhook (Origem)"
"Extract Fields"
"Code (Map State)"
"HTTP Request (Servico - acao)"
```

## Mapeamentos

Sempre em Code Nodes dedicados com validacao:

```javascript
if (!valorMapeado) {
  throw new Error("Valor nao mapeado: " + original);
}
```

## HTTP Requests

- Sempre definir Content-Type correto
- Nunca hardcode de token no body ou header
- Usar credenciais por referencia

---

# Estrutura do Projeto

```
src/
  orchestrator/
    index.js           # Coordenador principal
  agents/
    core/
      specifier.js     # Linguagem natural -> SPEC
      architect.js     # SPEC -> Arquitetura
      builder.js       # Arquitetura -> JSON n8n
    quality/
      validator.js     # Validacao estrutural
      tester.js        # Testes funcionais
      security.js      # Auditoria de seguranca
      idempotency.js   # Anti-duplicacao
      observability.js # Logging e rastreio
    specialists/
      mapping.js       # Mapeamentos entre sistemas
```

---

# Fluxo de Execucao

```
1. Usuario descreve workflow em linguagem natural
2. Specifier -> produz SPEC estruturada
3. Architect -> consulta specialists, desenha arquitetura
4. Builder -> gera JSON n8n
5. Quality agents -> validam em paralelo
6. Erros criticos? -> volta ao agente responsavel
7. OK -> workflow pronto para importar
```

---

# Principios

1. **Responsabilidade unica**: cada agente faz uma coisa
2. **Restricoes explicitas**: cada agente sabe o que NAO pode fazer
3. **Definition of Done como contrato**: Specifier define, Validator verifica
4. **Zero secrets no output**: Security Agent garante
5. **Pipeline determinista**: mesma entrada = mesma saida
