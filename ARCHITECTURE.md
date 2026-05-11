# Arquitetura Multi-Agente

## Visao Geral

O sistema segue o padrao **Orchestrator + Specialist Agents**, onde um coordenador central delega tarefas para agentes com responsabilidades bem definidas.

## Por que Multi-Agente?

Gerar um workflow n8n valido exige decisoes em multiplos niveis:

1. **Requisitos** - O que o workflow precisa fazer?
2. **Arquitetura** - Como organizar os nodes?
3. **Implementacao** - Como gerar o JSON correto?
4. **Qualidade** - O resultado esta correto e seguro?

Um unico agente tentando fazer tudo tende a misturar responsabilidades e produzir resultados inconsistentes. Separar em agentes especializados permite:

- Cada agente focar em uma unica preocupacao
- Restricoes explicitas evitam que agentes extrapolem seu escopo
- O pipeline e determinista e auditavel
- Novos agentes podem ser adicionados sem alterar os existentes

## Os 3 Grupos de Agentes

### Core Agents (Pipeline Sequencial)

```
Specifier -> Architect -> Builder
```

Executam sempre, nesta ordem. A saida de um e a entrada do proximo.

**Specifier**: O "Product Manager" do sistema. Transforma linguagem natural em especificacao estruturada. Nao sabe nada sobre JSON ou nodes - apenas sobre requisitos.

**Architect**: O "Tech Lead". Recebe a SPEC e decide a estrutura tecnica: quais nodes usar, em que ordem, como tratar erros. Nao gera codigo - apenas o blueprint.

**Builder**: O "Developer". Recebe SPEC + Arquitetura e gera o JSON final. Segue estritamente o que foi definido, sem tomar decisoes arquiteturais.

### Quality Agents (Validacao Automatica)

```
Validator + Tester + Security + Idempotency + Observability
```

Executam apos o Builder, em paralelo. Nenhum deles modifica o workflow - apenas reportam.

**Validator**: Verifica regras estruturais (naming, connections, credentials).
**Tester**: Simula execucao com payloads reais e de erro.
**Security**: Busca secrets hardcoded, tokens expostos.
**Idempotency**: Garante que reprocessamento nao causa duplicacao.
**Observability**: Verifica se o workflow tem logging e rastreabilidade adequados.

### Specialist Agents (Sob Demanda)

```
Mapping + Domain Specialists
```

Consultados pelo Architect ou Validator quando o dominio exige conhecimento especifico.

**Mapping**: Valida mapeamentos entre sistemas (ex: estados, campos, formatos).
**Domain Specialists**: Conhecem regras de APIs especificas (headers, formatos de payload, limitacoes).

## Fluxo de Execucao

```
1. Usuario descreve workflow em linguagem natural
2. Specifier analisa e produz SPEC
3. Architect consulta specialists e desenha arquitetura
4. Builder gera JSON n8n
5. Quality agents validam em paralelo
6. Se houver erros criticos -> volta ao passo relevante
7. Se OK -> workflow pronto para importar
```

## Restricoes como Feature

Cada agente tem restricoes explicitas documentadas no codigo:

```javascript
/**
 * Restricoes:
 * - NAO gerar JSON final
 * - NAO alterar requisitos da SPEC
 */
class ArchitectAgent { ... }
```

Isso evita o problema comum em sistemas multi-agente onde agentes "escapam" do escopo e tomam decisoes que nao deveriam.

## Pattern: Definition of Done como Contrato

O Specifier define criterios objetivos de aceite. O Validator verifica esses mesmos criterios no workflow gerado. Isso cria um loop de feedback fechado:

```
Specifier define DoD -> Builder gera -> Validator verifica DoD
```

Se o Validator encontra violacoes, o sistema sabe exatamente o que esta errado e pode pedir correcao ao agente responsavel.
