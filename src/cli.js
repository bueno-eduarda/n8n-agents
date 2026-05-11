#!/usr/bin/env node

/**
 * CLI - N8N Workflow Generator
 *
 * Usage:
 * - node src/cli.js "description"     -> Generate workflow
 * - node src/cli.js                   -> Interactive mode
 */

const readline = require('readline');
const WorkflowOrchestrator = require('./orchestrator');

const args = process.argv.slice(2);

async function main() {
  console.log('========================================');
  console.log('  N8N Workflow Generator');
  console.log('  Multi-Agent System (11 agents)');
  console.log('========================================\n');

  let description = args.join(' ');

  if (!description) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    description = await new Promise(resolve => {
      rl.question('Describe the workflow you want to create:\n> ', answer => {
        rl.close();
        resolve(answer);
      });
    });
  }

  if (!description || description.trim() === '') {
    console.error('Error: Description is required');
    process.exit(1);
  }

  console.log(`\nInput: "${description}"\n`);
  console.log('Processing through 11 agents...\n');

  try {
    const orchestrator = new WorkflowOrchestrator();
    const result = await orchestrator.generate(description);

    const filename = `workflow_${Date.now()}.json`;
    const filepath = orchestrator.saveWorkflow(result.workflow, filename);

    showResults(result, filepath);

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

function showResults(result, filepath = null) {
  const valStatus = result.results.validation.valid ? 'PASS' : 'FAIL';
  const secStatus = result.results.security.secure ? 'PASS' : 'FAIL';
  const obsStatus = result.results.observability.summary.critical === 0 ? 'PASS' : 'WARN';
  const testStatus = result.results.tests.allPassed ? 'PASS' : 'FAIL';

  console.log('========================================');
  console.log('         GENERATION SUMMARY');
  console.log('========================================\n');

  console.log(`Workflow: ${result.workflow.name}`);
  console.log(`Nodes: ${result.workflow.nodes.length}`);
  console.log(`Connections: ${Object.keys(result.workflow.connections).length}\n`);

  console.log(`[${valStatus}] Validation: ${result.results.validation.summary.totalErrors} errors, ${result.results.validation.summary.totalWarnings} warnings`);
  console.log(`[${secStatus}] Security: ${result.results.security.issues.length} issues`);
  console.log(`[${obsStatus}] Observability: ${result.results.observability.summary.critical} critical`);
  console.log(`[${testStatus}] Tests: ${result.results.tests.summary.passed}/${result.results.tests.summary.total} passed\n`);

  const allGood = result.results.validation.valid &&
                  result.results.security.secure &&
                  result.results.tests.allPassed;

  if (allGood) {
    console.log('WORKFLOW READY! Import the JSON file into n8n.\n');
  } else {
    console.log('Workflow generated with issues.\n');
  }

  if (filepath) {
    console.log(`Saved to: ${filepath}\n`);
  }
}

main().catch(console.error);
