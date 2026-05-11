/**
 * Specifier Agent
 *
 * Missao: Transformar solicitacao informal em SPEC estruturada e completa
 *
 * Responsabilidades:
 * - Refinar objetivo
 * - Identificar trigger correto
 * - Identificar integracoes envolvidas
 * - Listar campos obrigatorios
 * - Identificar mapeamentos necessarios
 * - Definir criterios de erro
 * - Definir saida esperada
 * - Estruturar Definition of Done
 *
 * Restricoes:
 * - NAO gerar JSON
 * - NAO definir estrutura tecnica de nodes
 * - NAO tomar decisoes arquiteturais
 */

class SpecifierAgent {
  constructor() {
    this.triggers = {
      'ticket.created': 'Criacao de ticket no sistema de suporte',
      'ticket.state.updated': 'Atualizacao de estado de ticket',
      'ticket.note.created': 'Criacao de comentario no ticket',
      'workitem.updated': 'Atualizacao de Work Item no sistema de projetos'
    };

    this.integrations = ['Support System', 'Project Management'];
  }

  /**
   * Transforma descricao informal em SPEC estruturada
   */
  specify(informalDescription) {
    console.log('Specifier Agent: Analisando solicitacao...\n');

    const spec = {
      objetivo: this.extractObjective(informalDescription),
      trigger: this.identifyTrigger(informalDescription),
      entradaEsperada: this.defineExpectedInput(informalDescription),
      regrasValidacao: this.defineValidationRules(informalDescription),
      integracoes: this.identifyIntegrations(informalDescription),
      mapeamentos: this.identifyMappings(informalDescription),
      criteriosErro: this.defineErrorCriteria(informalDescription),
      definitionOfDone: this.defineDoD(informalDescription)
    };

    this.printSpec(spec);
    return spec;
  }

  extractObjective(description) {
    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('issue')) {
      return 'Criar Issue no sistema de projetos quando ticket for criado no suporte';
    }

    if (normalized.includes('sincronizar') && normalized.includes('estado')) {
      return 'Sincronizar estado do ticket entre sistemas';
    }

    if (normalized.includes('comentario') || normalized.includes('comment')) {
      return 'Sincronizar comentarios entre sistemas';
    }

    if (normalized.includes('tag')) {
      return 'Mapear e sincronizar tags entre sistemas';
    }

    return `Integrar ${this.extractSource(description)} com ${this.extractDestination(description)}`;
  }

  identifyTrigger(description) {
    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('ticket')) {
      return {
        type: 'webhook',
        event: 'ticket.created',
        source: 'Support System',
        description: 'Webhook recebe evento de criacao de ticket'
      };
    }

    if (normalized.includes('estado') || normalized.includes('state')) {
      return {
        type: 'webhook',
        event: 'ticket.state.updated',
        source: 'Support System',
        description: 'Webhook recebe evento de atualizacao de estado'
      };
    }

    if (normalized.includes('comentario') || normalized.includes('comment')) {
      return {
        type: 'webhook',
        event: 'ticket.note.created',
        source: 'Support System',
        description: 'Webhook recebe evento de criacao de comentario'
      };
    }

    return {
      type: 'webhook',
      event: 'generic',
      source: this.extractSource(description),
      description: 'Webhook generico'
    };
  }

  defineExpectedInput(description) {
    const trigger = this.identifyTrigger(description);

    if (trigger.event === 'ticket.created') {
      return {
        source: 'Webhook',
        format: 'JSON',
        camposObrigatorios: [
          'body.data.item.id',
          'body.data.item.ticket_id',
          'body.data.item.ticket_attributes._default_title_',
          'body.data.item.ticket_attributes._default_description_',
          'body.data.item.contacts.contacts[0].id',
          'body.data.item.company_id'
        ],
        exemplo: {
          body: {
            topic: 'ticket.created',
            data: {
              item: {
                id: '100000000000001',
                ticket_id: '10001',
                ticket_attributes: {
                  _default_title_: 'Exemplo de titulo',
                  _default_description_: 'Exemplo de descricao'
                }
              }
            }
          }
        }
      };
    }

    if (trigger.event === 'ticket.state.updated') {
      return {
        source: 'Webhook',
        format: 'JSON',
        camposObrigatorios: [
          'body.data.item.ticket_state.id',
          'body.data.item.ticket_attributes["External ID"]'
        ]
      };
    }

    return {
      source: trigger.source,
      format: 'JSON',
      camposObrigatorios: []
    };
  }

  defineValidationRules(description) {
    const rules = [];
    const normalized = description.toLowerCase();

    if (normalized.includes('criar') && normalized.includes('issue')) {
      rules.push('Ticket ID deve existir');
      rules.push('Titulo nao pode ser vazio');
      rules.push('Contato deve existir');
      rules.push('Email do contato e obrigatorio');
    }

    if (normalized.includes('estado') || normalized.includes('state')) {
      rules.push('ticket_state.id deve estar mapeado');
      rules.push('External ID deve existir no ticket');
    }

    if (normalized.includes('comentario')) {
      rules.push('External ID deve existir');
      rules.push('Comentario nao pode ser vazio');
    }

    return rules;
  }

  identifyIntegrations(description) {
    const integrations = [];
    const normalized = description.toLowerCase();

    if (normalized.includes('suporte') || normalized.includes('support') || normalized.includes('ticket')) {
      integrations.push({
        nome: 'Support System',
        tipo: 'source',
        credencial: 'support_bearer_auth'
      });
    }

    if (normalized.includes('projeto') || normalized.includes('project') || normalized.includes('issue')) {
      integrations.push({
        nome: 'Project Management',
        tipo: 'destination',
        credencial: 'project_pat_auth'
      });
    }

    if (integrations.length === 0) {
      integrations.push(
        { nome: 'Source System', tipo: 'source', credencial: 'source_auth' },
        { nome: 'Destination System', tipo: 'destination', credencial: 'destination_auth' }
      );
    }

    return integrations;
  }

  identifyMappings(description) {
    const mappings = [];
    const normalized = description.toLowerCase();

    if (normalized.includes('estado') || normalized.includes('state')) {
      mappings.push({
        tipo: 'Estado entre sistemas',
        origem: 'ticket_state.id',
        destino: 'System.State',
        obrigatorio: true
      });
    }

    if (normalized.includes('tag')) {
      mappings.push({
        tipo: 'Ticket Type para Tag',
        origem: 'ticket_type.name',
        destino: 'System.Tags',
        obrigatorio: false
      });
    }

    if (normalized.includes('criar') && normalized.includes('ticket')) {
      mappings.push({
        tipo: 'Normalizacao de Ambiente',
        origem: 'contact (ios/android/web)',
        destino: 'Custom.OperationalSystem',
        obrigatorio: true
      });
    }

    return mappings;
  }

  defineErrorCriteria(description) {
    return [
      'Falha na validacao de campos obrigatorios',
      'Valor nao mapeado encontrado',
      'Credenciais invalidas ou ausentes',
      'Timeout na API externa',
      'Payload malformado'
    ];
  }

  defineDoD(description) {
    return {
      funcional: [
        'Workflow processa payload corretamente',
        'Integracoes respondem com sucesso',
        'Mapeamentos retornam valores corretos',
        'Campos obrigatorios sao preenchidos'
      ],
      tecnico: [
        'JSON importavel no n8n',
        'Credenciais corretas utilizadas',
        'Nomes de nodes padronizados',
        'Mapeamentos isolados em Code Nodes',
        'Headers HTTP corretos',
        'Sem hardcoded secrets'
      ],
      qualidade: [
        'Sem nodes orfaos',
        'Erros explicitos para cenarios invalidos',
        'Separacao clara de responsabilidades',
        'Workflow validado contra convencoes'
      ]
    };
  }

  extractSource(description) {
    if (description.toLowerCase().includes('suporte')) return 'Support System';
    if (description.toLowerCase().includes('support')) return 'Support System';
    return 'Source';
  }

  extractDestination(description) {
    const parts = description.toLowerCase().split(/para|to|→/);
    if (parts.length > 1) {
      if (parts[1].includes('projeto') || parts[1].includes('project')) return 'Project Management';
    }
    return 'Destination';
  }

  printSpec(spec) {
    console.log('SPEC ESTRUTURADA:\n');
    console.log(`Objetivo: ${spec.objetivo}`);
    console.log(`\nTrigger: ${spec.trigger.event} (${spec.trigger.source})`);
    console.log(`   ${spec.trigger.description}`);

    console.log(`\nEntrada Esperada:`);
    console.log(`   Source: ${spec.entradaEsperada.source}`);
    console.log(`   Campos obrigatorios: ${spec.entradaEsperada.camposObrigatorios.length}`);

    console.log(`\nRegras de Validacao: ${spec.regrasValidacao.length}`);
    spec.regrasValidacao.forEach(rule => console.log(`   - ${rule}`));

    console.log(`\nIntegracoes: ${spec.integracoes.length}`);
    spec.integracoes.forEach(int => {
      console.log(`   - ${int.nome} (${int.tipo})`);
    });

    console.log(`\nMapeamentos: ${spec.mapeamentos.length}`);
    spec.mapeamentos.forEach(map => {
      console.log(`   - ${map.tipo}`);
    });

    console.log(`\nCriterios de Erro: ${spec.criteriosErro.length}`);

    console.log(`\nDefinition of Done:`);
    console.log(`   Funcional: ${spec.definitionOfDone.funcional.length} criterios`);
    console.log(`   Tecnico: ${spec.definitionOfDone.tecnico.length} criterios`);
    console.log(`   Qualidade: ${spec.definitionOfDone.qualidade.length} criterios`);

    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = SpecifierAgent;
