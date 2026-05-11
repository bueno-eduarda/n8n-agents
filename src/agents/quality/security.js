/**
 * Security Agent
 *
 * Missao: Garantir seguranca e conformidade
 *
 * Responsabilidades:
 * - Verificar ausencia de tokens hardcoded
 * - Garantir uso correto de credenciais
 * - Impedir exposicao de secrets
 * - Validar headers sensiveis
 */

class SecurityAgent {
  constructor() {
    this.sensitivePatterns = [
      /Bearer\s+[A-Za-z0-9\-._~+/]+=*/,
      /token["\s:]+[A-Za-z0-9\-._~+/]+=*/i,
      /api[_-]?key["\s:]+[A-Za-z0-9\-._~+/]+=*/i,
      /password["\s:]+.+/i,
      /secret["\s:]+[A-Za-z0-9\-._~+/]+=*/i
    ];
  }

  validate(workflow) {
    console.log('Security Agent: Validando seguranca...\n');

    const issues = [];

    issues.push(...this.checkHardcodedSecrets(workflow));
    issues.push(...this.checkCredentialUsage(workflow));
    issues.push(...this.checkSensitiveHeaders(workflow));
    issues.push(...this.checkExposedData(workflow));

    if (issues.length > 0) {
      console.log('Problemas de seguranca encontrados:\n');
      issues.forEach(issue => console.log(`   ${issue.severity}: ${issue.message}`));
      console.log('');

      const critical = issues.filter(i => i.severity === 'CRITICAL');
      if (critical.length > 0) {
        throw new Error(`Falha de seguranca critica: ${critical[0].message}`);
      }
    } else {
      console.log('Nenhum problema de seguranca encontrado\n');
    }

    console.log('='.repeat(60) + '\n');

    return {
      secure: issues.filter(i => i.severity === 'CRITICAL').length === 0,
      issues
    };
  }

  checkHardcodedSecrets(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      const content = JSON.stringify(node.parameters || {});

      this.sensitivePatterns.forEach(pattern => {
        if (pattern.test(content)) {
          issues.push({
            severity: 'CRITICAL',
            node: node.name,
            message: `Possivel secret hardcoded detectado em "${node.name}"`,
            type: 'hardcoded_secret'
          });
        }
      });
    });

    return issues;
  }

  checkCredentialUsage(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        if (!node.credentials && !node.parameters.authentication) {
          issues.push({
            severity: 'WARNING',
            node: node.name,
            message: `HTTP Request sem autenticacao em "${node.name}"`,
            type: 'missing_auth'
          });
        }
      }
    });

    return issues;
  }

  checkSensitiveHeaders(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.httpRequest') {
        const headers = node.parameters?.headerParameters?.parameters || [];

        headers.forEach(header => {
          if (header.name.toLowerCase() === 'authorization') {
            if (header.value && !header.value.startsWith('={{')) {
              issues.push({
                severity: 'CRITICAL',
                node: node.name,
                message: `Header Authorization hardcoded em "${node.name}"`,
                type: 'hardcoded_auth_header'
              });
            }
          }

          const sensitiveHeaders = ['x-api-key', 'api-key', 'token'];
          if (sensitiveHeaders.includes(header.name.toLowerCase())) {
            if (header.value && !header.value.startsWith('={{')) {
              issues.push({
                severity: 'WARNING',
                node: node.name,
                message: `Header sensivel "${header.name}" possivelmente hardcoded em "${node.name}"`,
                type: 'sensitive_header'
              });
            }
          }
        });
      }
    });

    return issues;
  }

  checkExposedData(workflow) {
    const issues = [];

    workflow.nodes.forEach(node => {
      if (node.type === 'n8n-nodes-base.code') {
        const code = node.parameters?.jsCode || '';

        if (code.includes('console.log')) {
          issues.push({
            severity: 'INFO',
            node: node.name,
            message: `console.log encontrado em "${node.name}" - verificar se nao expoe dados sensiveis`,
            type: 'console_log'
          });
        }
      }
    });

    return issues;
  }
}

module.exports = SecurityAgent;
