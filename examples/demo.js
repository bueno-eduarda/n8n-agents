/**
 * Demo - Generate a sample workflow using the multi-agent system
 */

const WorkflowOrchestrator = require('../src/orchestrator');

async function demo() {
  console.log('========================================');
  console.log('  Demo - N8N Workflow Generator');
  console.log('  11 Specialized Agents');
  console.log('========================================\n');

  const orchestrator = new WorkflowOrchestrator();

  const description = 'Criar fluxo que sincroniza estado do ticket do suporte para o sistema de projetos';

  console.log(`Input: "${description}"\n`);

  try {
    const result = await orchestrator.generate(description);

    const filename = `demo_workflow_${Date.now()}.json`;
    const filepath = orchestrator.saveWorkflow(result.workflow, filename);

    console.log('========================================');
    console.log('          WORKFLOW SUMMARY');
    console.log('========================================\n');

    console.log(`Workflow: ${result.workflow.name}`);
    console.log(`Nodes: ${result.workflow.nodes.length}`);
    console.log(`Connections: ${Object.keys(result.workflow.connections).length}\n`);

    const valStatus = result.results.validation.valid ? 'PASS' : 'FAIL';
    const secStatus = result.results.security.secure ? 'PASS' : 'FAIL';
    const testStatus = result.results.tests.allPassed ? 'PASS' : 'FAIL';

    console.log(`[${valStatus}] Validation`);
    console.log(`[${secStatus}] Security`);
    console.log(`[${testStatus}] Tests: ${result.results.tests.summary.passed}/${result.results.tests.summary.total}\n`);

    const allGood = result.results.validation.valid &&
                    result.results.security.secure &&
                    result.results.tests.allPassed;

    if (allGood) {
      console.log('WORKFLOW READY!\n');
    } else {
      console.log('Generated with issues - review above.\n');
    }

    console.log(`File: ${filepath}`);
    console.log('\nImport this file into n8n!\n');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
  }
}

demo().catch(console.error);
