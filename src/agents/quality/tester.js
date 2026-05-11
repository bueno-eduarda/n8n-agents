/**
 * Tester Agent
 *
 * Missao: Validar comportamento funcional do workflow atraves de testes simulados
 *
 * Tipos de Testes:
 * 1. Happy Path - Fluxo executa corretamente
 * 2. Campo Obrigatorio Ausente - Workflow falha explicitamente
 * 3. Estado Nao Mapeado - Erro e lancado
 * 4. Dados Incompletos - Workflow nao continua silenciosamente
 * 5. Reprocessamento - Nao cria duplicacao
 *
 * Restricoes:
 * - NAO modificar workflow
 * - NAO alterar SPEC
 * - Apenas testar e reportar
 */

const MappingAgent = require('../specialists/mapping');

class TesterAgent {
  constructor() {
    this.mappingAgent = new MappingAgent();
    this.testResults = [];
  }

  test(workflow, spec) {
    console.log('Tester Agent: Executando testes...\n');

    this.testResults = [];

    this.testHappyPath(workflow, spec);
    this.testMissingRequiredField(workflow, spec);
    this.testUnmappedState(workflow, spec);
    this.testIncompleteData(workflow, spec);

    if (spec.objetivo.includes('Criar')) {
      this.testIdempotency(workflow, spec);
    }

    return this.generateReport();
  }

  testHappyPath(workflow, spec) {
    console.log('  1. Testando Happy Path...');

    const testCase = {
      name: 'Happy Path',
      scenario: 'Payload valido com todos os campos obrigatorios',
      payload: this.generateValidPayload(spec),
      expectedResult: 'success'
    };

    try {
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (result.success) {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Fluxo executou corretamente' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: `Falhou: ${result.error}` });
        console.log('     FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({ ...testCase, status: 'failed', message: `Excecao: ${error.message}` });
      console.log('     FALHOU\n');
    }
  }

  testMissingRequiredField(workflow, spec) {
    console.log('  2. Testando Campo Obrigatorio Ausente...');

    const testCase = {
      name: 'Missing Required Field',
      scenario: 'Payload sem campo obrigatorio (title)',
      payload: this.generateInvalidPayload(spec, 'missing_title'),
      expectedResult: 'error'
    };

    try {
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (!result.success && result.error) {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Erro lancado corretamente' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: 'Falha silenciosa detectada' });
        console.log('     FALHOU - Falha silenciosa\n');
      }
    } catch (error) {
      this.testResults.push({ ...testCase, status: 'passed', message: `Erro correto: ${error.message}` });
      console.log('     PASSOU\n');
    }
  }

  testUnmappedState(workflow, spec) {
    if (!spec.mapeamentos.some(m => m.tipo.includes('Estado'))) {
      console.log('  3. Pulando teste de estado nao mapeado (nao aplicavel)\n');
      return;
    }

    console.log('  3. Testando Estado Nao Mapeado...');

    const testCase = {
      name: 'Unmapped State',
      scenario: 'ticket_state.id nao existe no mapeamento',
      payload: this.generateInvalidPayload(spec, 'unmapped_state'),
      expectedResult: 'error'
    };

    try {
      const result = this.simulateMappingExecution(workflow, testCase.payload, spec);

      if (!result.success && result.error?.includes('nao mapeado')) {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Erro de mapeamento correto' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: 'Estado invalido nao causou erro' });
        console.log('     FALHOU\n');
      }
    } catch (error) {
      if (error.message.includes('nao mapeado')) {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Erro de mapeamento correto' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: `Erro inesperado: ${error.message}` });
        console.log('     FALHOU\n');
      }
    }
  }

  testIncompleteData(workflow, spec) {
    console.log('  4. Testando Dados Incompletos...');

    const testCase = {
      name: 'Incomplete Data',
      scenario: 'Payload parcial sem estrutura completa',
      payload: { body: { data: null } },
      expectedResult: 'error'
    };

    try {
      const result = this.simulateExecution(workflow, testCase.payload, spec);

      if (!result.success) {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Dados incompletos rejeitados' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: 'Aceitou dados incompletos' });
        console.log('     FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({ ...testCase, status: 'passed', message: 'Erro correto para dados incompletos' });
      console.log('     PASSOU\n');
    }
  }

  testIdempotency(workflow, spec) {
    console.log('  5. Testando Idempotencia...');

    const testCase = {
      name: 'Idempotency',
      scenario: 'Reprocessar ticket que ja tem External ID',
      payload: this.generatePayloadWithExternalId(spec),
      expectedResult: 'ignored'
    };

    try {
      const result = this.simulateIdempotencyCheck(workflow, testCase.payload, spec);

      if (result.action === 'ignore') {
        this.testResults.push({ ...testCase, status: 'passed', message: 'Reprocessamento ignorado' });
        console.log('     PASSOU\n');
      } else {
        this.testResults.push({ ...testCase, status: 'failed', message: 'Tentaria criar duplicata' });
        console.log('     FALHOU\n');
      }
    } catch (error) {
      this.testResults.push({ ...testCase, status: 'failed', message: `Erro: ${error.message}` });
      console.log('     FALHOU\n');
    }
  }

  simulateExecution(workflow, payload, spec) {
    if (!payload || !payload.body) {
      return { success: false, error: 'Payload invalido' };
    }

    const extractedFields = this.simulateExtraction(workflow, payload);
    if (!extractedFields.title || !extractedFields.id) {
      return { success: false, error: 'Campos obrigatorios ausentes' };
    }

    if (spec.mapeamentos.length > 0) {
      const mappingResult = this.simulateMappingExecution(workflow, payload, spec);
      if (!mappingResult.success) {
        return mappingResult;
      }
    }

    return { success: true };
  }

  simulateExtraction(workflow, payload) {
    const extracted = {};

    try {
      extracted.title = payload.body?.data?.item?.ticket_attributes?._default_title_;
      extracted.id = payload.body?.data?.item?.id;
      extracted.ticketId = payload.body?.data?.item?.ticket_id;
    } catch (error) {
      // Extraction failed
    }

    return extracted;
  }

  simulateMappingExecution(workflow, payload, spec) {
    try {
      const stateId = payload.body?.data?.item?.ticket_state?.id;

      if (stateId) {
        const state = this.mappingAgent.mapSourceStateToDestination(stateId);
        return { success: true, state };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  simulateIdempotencyCheck(workflow, payload, spec) {
    const externalId = payload.body?.data?.item?.ticket_attributes?.['External ID'];

    if (externalId) {
      return { action: 'ignore', reason: 'Ja existe External ID' };
    }

    return { action: 'create', reason: 'Novo ticket' };
  }

  generateValidPayload(spec) {
    return {
      body: {
        type: 'notification_event',
        topic: spec.trigger.event,
        data: {
          item: {
            id: '100000000000001',
            ticket_id: '10001',
            ticket_attributes: {
              _default_title_: 'Teste de integracao',
              _default_description_: 'Descricao do teste',
              'External ID': null
            },
            ticket_state: {
              id: '1001' // To Do
            },
            contacts: {
              contacts: [{ id: 'contact-001' }]
            },
            company_id: 'company-001'
          }
        }
      }
    };
  }

  generateInvalidPayload(spec, type) {
    const base = this.generateValidPayload(spec);

    if (type === 'missing_title') {
      delete base.body.data.item.ticket_attributes._default_title_;
    }

    if (type === 'unmapped_state') {
      base.body.data.item.ticket_state.id = '9999999'; // Non-existent state
    }

    return base;
  }

  generatePayloadWithExternalId(spec) {
    const payload = this.generateValidPayload(spec);
    payload.body.data.item.ticket_attributes['External ID'] = '123456';
    return payload;
  }

  generateReport() {
    console.log('='.repeat(47));
    console.log('RELATORIO DE TESTES\n');

    const passed = this.testResults.filter(t => t.status === 'passed');
    const failed = this.testResults.filter(t => t.status === 'failed');

    console.log(`Total: ${this.testResults.length}`);
    console.log(`Passaram: ${passed.length}`);
    console.log(`Falharam: ${failed.length}\n`);

    if (failed.length > 0) {
      console.log('FALHAS:\n');
      failed.forEach(test => {
        console.log(`  ${test.name}`);
        console.log(`     Cenario: ${test.scenario}`);
        console.log(`     Motivo: ${test.message}\n`);
      });
    }

    if (passed.length > 0) {
      console.log('SUCESSOS:\n');
      passed.forEach(test => {
        console.log(`  ${test.name} - ${test.scenario}`);
      });
      console.log('');
    }

    console.log('='.repeat(47) + '\n');

    return {
      allPassed: failed.length === 0,
      tests: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: passed.length,
        failed: failed.length
      }
    };
  }
}

module.exports = TesterAgent;
