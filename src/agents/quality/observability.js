/**
 * Observability Agent
 *
 * Missao: Garantir que falhas sejam visiveis e rastreaveis
 *
 * Responsabilidades:
 * - Garantir erros explicitos
 * - Impedir falhas silenciosas
 * - Sugerir pontos de log
 * - Garantir rastreabilidade
 */

class ObservabilityAgent {
  constructor() {
    this.checks = [];
  }

  analyze(workflow, spec) {
    console.log('Observability Agent: Analisando rastreabilidade...\n');

    this.checks = [];

    this.checkErrorHandling(workflow);
    this.checkLogPoints(workflow);
    this.checkTraceability(workflow, spec);
    this.checkSilentFailures(workflow);

    return this.generateChecklist();
  }

  checkErrorHandling(workflow) {
    const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      const hasMappingCode = code.includes('const map = {') || code.includes('const tagMap = {');
      const hasErrorHandling = code.includes('throw new Error');

      if (hasMappingCode && !hasErrorHandling) {
        this.checks.push({
          status: 'warning',
          node: node.name,
          message: 'Mapeamento sem throw Error - falhas podem passar silenciosamente',
          recommendation: 'Adicionar: throw new Error("Valor nao mapeado: " + value)',
          type: 'error_handling'
        });
      } else if (hasMappingCode && hasErrorHandling) {
        this.checks.push({
          status: 'ok',
          node: node.name,
          message: 'Erro explicito implementado',
          type: 'error_handling'
        });
      }
    });
  }

  checkLogPoints(workflow) {
    const criticalNodes = workflow.nodes.filter(n =>
      n.type === 'n8n-nodes-base.httpRequest' ||
      n.type === 'n8n-nodes-base.code'
    );

    criticalNodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        this.checks.push({
          status: 'info',
          node: node.name,
          message: 'Ponto de integracao externa',
          recommendation: 'Considere habilitar logs de erro no n8n para este node',
          type: 'log_point'
        });
      }
    });
  }

  checkTraceability(workflow, spec) {
    const hasIdFields = this.hasTraceableIds(workflow);

    if (!hasIdFields) {
      this.checks.push({
        status: 'warning',
        node: 'general',
        message: 'Faltam campos de rastreamento (ticket_id, external_id)',
        recommendation: 'Incluir IDs de rastreamento em nodes de extracao',
        type: 'traceability'
      });
    } else {
      this.checks.push({
        status: 'ok',
        node: 'general',
        message: 'Campos de rastreamento presentes',
        type: 'traceability'
      });
    }
  }

  checkSilentFailures(workflow) {
    const codeNodes = workflow.nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      if (code.includes('try {') && code.includes('catch')) {
        if (!code.includes('throw') && !code.includes('console.error')) {
          this.checks.push({
            status: 'critical',
            node: node.name,
            message: 'try-catch pode suprimir erros silenciosamente',
            recommendation: 'Re-lancar erro ou fazer log explicito no catch',
            type: 'silent_failure'
          });
        }
      }

      if (code.includes('if (!') && !code.includes('throw')) {
        this.checks.push({
          status: 'warning',
          node: node.name,
          message: 'Validacao sem throw Error',
          recommendation: 'Lancar erro quando validacao falhar',
          type: 'silent_failure'
        });
      }
    });
  }

  hasTraceableIds(workflow) {
    const extractNodes = workflow.nodes.filter(n =>
      n.type === 'n8n-nodes-base.set' &&
      n.name.toLowerCase().includes('extract')
    );

    if (extractNodes.length === 0) return false;

    return extractNodes.some(node => {
      const assignments = node.parameters?.assignments?.assignments || [];
      return assignments.some(a =>
        ['ticketId', 'externalId', 'ticket_id', 'id'].includes(a.name)
      );
    });
  }

  generateChecklist() {
    console.log('='.repeat(47));
    console.log('CHECKLIST DE OBSERVABILIDADE\n');

    const critical = this.checks.filter(c => c.status === 'critical');
    const warnings = this.checks.filter(c => c.status === 'warning');
    const ok = this.checks.filter(c => c.status === 'ok');
    const info = this.checks.filter(c => c.status === 'info');

    if (critical.length > 0) {
      console.log('CRITICO:');
      critical.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        console.log(`   -> ${c.recommendation}\n`);
      });
    }

    if (warnings.length > 0) {
      console.log('AVISOS:');
      warnings.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        if (c.recommendation) console.log(`   -> ${c.recommendation}`);
        console.log('');
      });
    }

    if (ok.length > 0) {
      console.log('OK:');
      ok.forEach(c => console.log(`   [${c.node}] ${c.message}`));
      console.log('');
    }

    if (info.length > 0) {
      console.log('INFO:');
      info.forEach(c => {
        console.log(`   [${c.node}] ${c.message}`);
        if (c.recommendation) console.log(`   -> ${c.recommendation}`);
        console.log('');
      });
    }

    console.log('='.repeat(47) + '\n');

    return {
      passed: critical.length === 0,
      checks: this.checks,
      summary: {
        critical: critical.length,
        warnings: warnings.length,
        ok: ok.length,
        info: info.length
      }
    };
  }
}

module.exports = ObservabilityAgent;
