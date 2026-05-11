/**
 * Orquestrador Principal
 * Coordena os 11 subagentes para gerar workflows n8n completos e validados
 *
 * Fluxo:
 * 1. Specifier    -> Transforma descricao informal em SPEC estruturada
 * 2. Architect    -> Define arquitetura tecnica do workflow
 * 3. Builder      -> Gera JSON importavel do n8n
 * 4. Validator    -> Valida estrutura contra Definition of Done
 * 5. Tester       -> Testa comportamento funcional
 *
 * Especialistas (consultados quando necessario):
 * - Mapping       -> Valida mapeamentos entre sistemas
 *
 * Qualidade (executados automaticamente):
 * - Idempotency   -> Evita duplicacoes
 * - Security      -> Garante seguranca
 * - Observability -> Garante rastreabilidade
 */

const SpecifierAgent = require('../agents/core/specifier');
const ArchitectAgent = require('../agents/core/architect');
const BuilderAgent = require('../agents/core/builder');

const ValidatorAgent = require('../agents/quality/validator');
const TesterAgent = require('../agents/quality/tester');
const SecurityAgent = require('../agents/quality/security');
const IdempotencyAgent = require('../agents/quality/idempotency');
const ObservabilityAgent = require('../agents/quality/observability');

const MappingAgent = require('../agents/specialists/mapping');

const fs = require('fs');
const path = require('path');

class WorkflowOrchestrator {
  constructor() {
    // Core Agents
    this.specifier = new SpecifierAgent();
    this.architect = new ArchitectAgent();
    this.builder = new BuilderAgent();

    // Quality Agents
    this.validator = new ValidatorAgent();
    this.tester = new TesterAgent();
    this.security = new SecurityAgent();
    this.idempotency = new IdempotencyAgent();
    this.observability = new ObservabilityAgent();

    // Specialist Agents
    this.mapping = new MappingAgent();
  }

  async generate(informalDescription) {
    console.log('========================================');
    console.log('  N8N Workflow Generator - Orchestrator');
    console.log('========================================\n');

    console.log(`Input: "${informalDescription}"\n`);
    console.log('='.repeat(60) + '\n');

    try {
      // PHASE 1: Specification
      console.log('PHASE 1: SPECIFICATION\n');
      const spec = this.specifier.specify(informalDescription);

      // PHASE 2: Architecture
      console.log('PHASE 2: ARCHITECTURE\n');
      const architecture = this.architect.design(spec);

      // PHASE 3: Build
      console.log('PHASE 3: BUILD\n');
      const workflow = this.builder.build(spec, architecture);

      // PHASE 4: Structural Validation
      console.log('PHASE 4: STRUCTURAL VALIDATION\n');
      const validationResult = this.validator.validate(workflow, spec);

      if (!validationResult.valid) {
        console.log('Validation failed. Review errors above.\n');
      }

      // PHASE 5: Security Validation
      console.log('PHASE 5: SECURITY VALIDATION\n');
      const securityResult = this.security.validate(workflow);

      if (!securityResult.secure) {
        throw new Error('Critical security issues detected');
      }

      // PHASE 6: Observability Analysis
      console.log('PHASE 6: OBSERVABILITY ANALYSIS\n');
      const observabilityResult = this.observability.analyze(workflow, spec);

      // PHASE 7: Functional Tests
      console.log('PHASE 7: FUNCTIONAL TESTS\n');
      const testResult = this.tester.test(workflow, spec);

      // FINAL REPORT
      this.printFinalReport({
        spec,
        architecture,
        workflow,
        validation: validationResult,
        security: securityResult,
        observability: observabilityResult,
        tests: testResult
      });

      return {
        workflow,
        results: {
          validation: validationResult,
          security: securityResult,
          observability: observabilityResult,
          tests: testResult
        }
      };

    } catch (error) {
      console.error('\nError generating workflow:', error.message);
      console.error(error.stack);
      throw error;
    }
  }

  printFinalReport(results) {
    console.log('========================================');
    console.log('         FINAL GENERATION REPORT');
    console.log('========================================\n');

    console.log(`Workflow: ${results.workflow.name}`);
    console.log(`Nodes: ${results.workflow.nodes.length}`);
    console.log(`Connections: ${Object.keys(results.workflow.connections).length}\n`);

    const valStatus = results.validation.valid ? 'PASS' : 'FAIL';
    console.log(`[${valStatus}] Validation: ${results.validation.summary.totalErrors} errors, ${results.validation.summary.totalWarnings} warnings`);

    const secStatus = results.security.secure ? 'PASS' : 'FAIL';
    console.log(`[${secStatus}] Security: ${results.security.issues.length} issues`);

    const obsStatus = results.observability.passed ? 'PASS' : 'WARN';
    console.log(`[${obsStatus}] Observability: ${results.observability.summary.critical} critical, ${results.observability.summary.warnings} warnings`);

    const testStatus = results.tests.allPassed ? 'PASS' : 'FAIL';
    console.log(`[${testStatus}] Tests: ${results.tests.summary.passed}/${results.tests.summary.total} passed\n`);

    const allGood = results.validation.valid &&
                    results.security.secure &&
                    results.tests.allPassed;

    if (allGood) {
      console.log('WORKFLOW READY FOR IMPORT!\n');
    } else {
      console.log('Workflow generated with issues - review reports above\n');
    }

    console.log('='.repeat(60) + '\n');
  }

  saveWorkflow(workflow, filename) {
    const outputDir = path.join(__dirname, '../../workflows');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(workflow, null, 2), 'utf-8');

    console.log(`Workflow saved to: ${filepath}\n`);
    return filepath;
  }

  checkIdempotency(context) {
    return this.idempotency.decide(context);
  }
}

module.exports = WorkflowOrchestrator;
