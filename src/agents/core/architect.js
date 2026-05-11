/**
 * Architect Agent
 *
 * Missao: Definir arquitetura tecnica do workflow antes da geracao do JSON
 *
 * Responsabilidades:
 * - Definir separacao de responsabilidades
 * - Determinar ordem dos nodes
 * - Definir pontos de normalizacao
 * - Definir pontos de mapeamento
 * - Definir estrategia de erro
 * - Garantir aderencia as convencoes
 *
 * Restricoes:
 * - NAO gerar JSON final
 * - NAO alterar requisitos da SPEC
 */

class ArchitectAgent {
  constructor() {
    this.nodePatterns = {
      webhook: { order: 1, responsibility: 'Receber evento externo' },
      extract: { order: 2, responsibility: 'Extrair campos do payload' },
      normalize: { order: 3, responsibility: 'Normalizar dados (ambiente, tags, etc)' },
      map: { order: 4, responsibility: 'Mapear valores entre sistemas' },
      validate: { order: 5, responsibility: 'Validar campos obrigatorios' },
      http: { order: 6, responsibility: 'Integracao externa (HTTP Request)' },
      update: { order: 7, responsibility: 'Atualizacao cruzada (opcional)' }
    };
  }

  /**
   * Define arquitetura baseada na SPEC
   */
  design(spec) {
    console.log('Architect Agent: Desenhando arquitetura...\n');

    const architecture = {
      nodes: this.defineNodes(spec),
      ordem: this.defineExecutionOrder(spec),
      conexoes: this.defineConnections(spec),
      pontosValidacao: this.defineValidationPoints(spec),
      pontosMapeamento: this.defineMappingPoints(spec),
      estrategiaErro: this.defineErrorStrategy(spec)
    };

    this.printArchitecture(architecture);
    return architecture;
  }

  defineNodes(spec) {
    const nodes = [];

    // 1. Webhook sempre primeiro
    nodes.push({
      id: 'webhook',
      type: 'n8n-nodes-base.webhook',
      name: `Webhook (${spec.trigger.source})`,
      responsibility: 'Receber evento do webhook',
      order: 1
    });

    // 2. Extract Fields (se houver campos obrigatorios)
    if (spec.entradaEsperada.camposObrigatorios.length > 0) {
      nodes.push({
        id: 'extract',
        type: 'n8n-nodes-base.set',
        name: 'Extract Fields',
        responsibility: 'Extrair campos do payload do webhook',
        order: 2
      });
    }

    // 3. Normalize (se houver necessidade)
    if (this.needsNormalization(spec)) {
      nodes.push({
        id: 'normalize',
        type: 'n8n-nodes-base.code',
        name: 'Normalize Environment',
        responsibility: 'Normalizar ambiente (iOS/Android/Web)',
        order: 3
      });
    }

    // 4. Map (se houver mapeamentos)
    spec.mapeamentos.forEach((mapping, index) => {
      nodes.push({
        id: `map_${index}`,
        type: 'n8n-nodes-base.code',
        name: `Code (Map ${mapping.tipo})`,
        responsibility: `Mapear ${mapping.tipo}`,
        order: 4 + index
      });
    });

    // 5. HTTP Request para integracao
    const lastOrder = nodes.length > 0 ? Math.max(...nodes.map(n => n.order)) : 0;
    nodes.push({
      id: 'http_request',
      type: 'n8n-nodes-base.httpRequest',
      name: `HTTP Request (${spec.integracoes.find(i => i.tipo.includes('destination'))?.nome || 'Destination'} - Action)`,
      responsibility: 'Executar acao na integracao destino',
      order: lastOrder + 1
    });

    return nodes;
  }

  defineExecutionOrder(spec) {
    const order = [
      '1. Webhook recebe evento',
      '2. Extracao de campos do payload',
    ];

    if (this.needsNormalization(spec)) {
      order.push('3. Normalizacao de dados');
    }

    if (spec.mapeamentos.length > 0) {
      order.push(`${order.length + 1}. Mapeamento de valores`);
    }

    order.push(`${order.length + 1}. Validacao de campos obrigatorios`);
    order.push(`${order.length + 1}. HTTP Request para integracao`);

    return order;
  }

  defineConnections(spec) {
    const connections = [];
    const nodes = this.defineNodes(spec);

    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push({
        from: nodes[i].id,
        to: nodes[i + 1].id,
        type: 'main',
        index: 0
      });
    }

    return connections;
  }

  defineValidationPoints(spec) {
    const validationPoints = [];

    validationPoints.push({
      after: 'extract',
      validates: spec.regrasValidacao,
      action: 'Lancar erro se validacao falhar'
    });

    if (spec.mapeamentos.length > 0) {
      validationPoints.push({
        after: 'map',
        validates: ['Valores mapeados existem'],
        action: 'Lancar erro se valor nao mapeado'
      });
    }

    return validationPoints;
  }

  defineMappingPoints(spec) {
    return spec.mapeamentos.map(mapping => ({
      node: `Code (Map ${mapping.tipo})`,
      origem: mapping.origem,
      destino: mapping.destino,
      obrigatorio: mapping.obrigatorio,
      errorHandling: 'throw new Error se nao mapeado'
    }));
  }

  defineErrorStrategy(spec) {
    return {
      campoObrigatorioAusente: 'Lancar erro explicito e parar execucao',
      valorNaoMapeado: 'Lancar erro com valor original',
      falhaIntegracao: 'Retornar erro HTTP com detalhes',
      payloadInvalido: 'Lancar erro de validacao no webhook',
      principio: 'Fail fast - nunca continuar com dados invalidos'
    };
  }

  needsNormalization(spec) {
    return spec.mapeamentos.some(m =>
      m.tipo.includes('Ambiente') ||
      m.tipo.includes('Environment') ||
      m.tipo.includes('Platform')
    );
  }

  printArchitecture(architecture) {
    console.log('PLANO ARQUITETURAL:\n');

    console.log('Nodes:');
    architecture.nodes.forEach(node => {
      console.log(`   ${node.order}. ${node.name}`);
      console.log(`      -> ${node.responsibility}`);
    });

    console.log('\nOrdem de Execucao:');
    architecture.ordem.forEach(step => console.log(`   ${step}`));

    console.log('\nConexoes:');
    architecture.conexoes.forEach(conn => {
      console.log(`   ${conn.from} -> ${conn.to}`);
    });

    console.log('\nPontos de Validacao:', architecture.pontosValidacao.length);
    console.log('Pontos de Mapeamento:', architecture.pontosMapeamento.length);

    console.log('\nEstrategia de Erro:');
    console.log(`   Principio: ${architecture.estrategiaErro.principio}`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = ArchitectAgent;
