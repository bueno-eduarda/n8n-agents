/**
 * Workflow Validator Agent
 *
 * Missao: Garantir que o workflow atende ao Definition of Done
 *
 * Responsabilidades:
 * - Verificar separacao de responsabilidades
 * - Verificar campos obrigatorios
 * - Verificar ausencia de hardcoded secrets
 * - Verificar mapeamentos isolados
 * - Verificar headers corretos
 * - Verificar ausencia de nodes orfaos
 *
 * Restricoes:
 * - NAO modificar workflow
 * - Apenas validar
 */

class ValidatorAgent {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  validate(workflow, spec) {
    console.log('Validator Agent: Validando workflow...\n');

    this.errors = [];
    this.warnings = [];

    this.validateNodeNames(workflow.nodes);
    this.validateCredentials(workflow.nodes);
    this.validateMappings(workflow.nodes);
    this.validateHttpRequests(workflow.nodes);
    this.validateConnections(workflow);
    this.validateDefinitionOfDone(workflow, spec);

    return this.generateReport();
  }

  validateNodeNames(nodes) {
    const genericNames = ['Node1', 'Node2', 'Code', 'HTTP Request3'];

    nodes.forEach(node => {
      if (genericNames.includes(node.name)) {
        this.errors.push(`Node com nome generico nao permitido: "${node.name}"`);
      }

      if (node.type === 'n8n-nodes-base.httpRequest') {
        if (!node.name.includes('HTTP Request (')) {
          this.warnings.push(`Node HTTP Request sem padrao: "${node.name}"`);
        }
      }

      if (node.type === 'n8n-nodes-base.code') {
        if (!node.name.includes('Code (') && !node.name.includes('Normalize') && !node.name.includes('Map')) {
          this.warnings.push(`Node Code sem descricao: "${node.name}"`);
        }
      }
    });
  }

  validateCredentials(nodes) {
    nodes.forEach(node => {
      if (node.parameters) {
        const params = JSON.stringify(node.parameters);
        if (params.includes('Bearer ') || params.includes('token:')) {
          this.errors.push(`Possivel token hardcoded no node "${node.name}"`);
        }
      }
    });
  }

  validateMappings(nodes) {
    const codeNodes = nodes.filter(n => n.type === 'n8n-nodes-base.code');

    codeNodes.forEach(node => {
      const code = node.parameters?.jsCode || '';

      if (code.includes('const map = {') || code.includes('const tagMap = {')) {
        if (!code.includes('throw new Error') && !code.includes('if (!')) {
          this.warnings.push(`Mapeamento sem validacao no node "${node.name}"`);
        }
      }
    });
  }

  validateHttpRequests(nodes) {
    const httpNodes = nodes.filter(n => n.type === 'n8n-nodes-base.httpRequest');

    httpNodes.forEach(node => {
      const params = node.parameters;

      if (params.sendBody && params.method !== 'GET') {
        const hasContentType = params.headerParameters?.parameters?.some(
          h => h.name === 'Content-Type'
        );

        if (!hasContentType) {
          this.errors.push(`HTTP Request sem Content-Type: "${node.name}"`);
        }
      }

      // Validate PATCH uses correct content type
      if (params.method === 'PATCH') {
        const headers = params.headerParameters?.parameters || [];
        const hasPatchContentType = headers.some(
          h => h.name === 'Content-Type' && h.value === 'application/json-patch+json'
        );

        if (!hasPatchContentType) {
          this.errors.push(`PATCH sem "application/json-patch+json": "${node.name}"`);
        }
      }

      // Validate API version in URL
      if (params.url?.includes('api') && !params.url.includes('api-version') && !params.url.includes('/api/')) {
        this.warnings.push(`Request possivelmente sem api-version: "${node.name}"`);
      }
    });
  }

  validateConnections(workflow) {
    workflow.nodes.forEach(node => {
      const hasIncoming = Object.values(workflow.connections).some(conn =>
        conn.main?.some(outputs =>
          outputs.some(out => out.node === node.name)
        )
      );

      const isWebhook = node.type === 'n8n-nodes-base.webhook';

      if (!hasIncoming && !isWebhook) {
        this.warnings.push(`Node orfao: "${node.name}"`);
      }
    });
  }

  validateDefinitionOfDone(workflow, spec) {
    if (!workflow.name) {
      this.errors.push('Workflow sem nome');
    }

    if (!workflow.nodes || workflow.nodes.length === 0) {
      this.errors.push('Workflow sem nodes');
    }

    if (!workflow.connections || Object.keys(workflow.connections).length === 0) {
      this.warnings.push('Workflow sem conexoes');
    }

    const hasWebhook = workflow.nodes.some(n => n.type === 'n8n-nodes-base.webhook');
    const hasHttp = workflow.nodes.some(n => n.type === 'n8n-nodes-base.httpRequest');

    if (!hasWebhook) {
      this.errors.push('Falta node Webhook');
    }

    if (!hasHttp) {
      this.errors.push('Falta node HTTP Request');
    }
  }

  generateReport() {
    const hasErrors = this.errors.length > 0;
    const hasWarnings = this.warnings.length > 0;

    console.log('='.repeat(47));
    console.log('RELATORIO DE VALIDACAO\n');

    if (hasErrors) {
      console.log('ERROS:');
      this.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
      console.log('');
    }

    if (hasWarnings) {
      console.log('AVISOS:');
      this.warnings.forEach((warn, i) => console.log(`  ${i + 1}. ${warn}`));
      console.log('');
    }

    if (!hasErrors && !hasWarnings) {
      console.log('Workflow valido!\n');
    }

    console.log('='.repeat(47) + '\n');

    return {
      valid: !hasErrors,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length
      }
    };
  }
}

module.exports = ValidatorAgent;
