/**
 * Builder Agent
 *
 * Missao: Gerar o JSON importavel do n8n
 *
 * Responsabilidades:
 * - Criar nodes conforme arquitetura
 * - Aplicar nomeacao padronizada
 * - Usar credenciais existentes (por referencia)
 * - Conectar corretamente os nodes
 * - Garantir JSON valido
 *
 * Restricoes:
 * - NAO hardcode de credenciais
 * - NAO misturar responsabilidades em nodes
 * - NAO alterar estrutura arquitetural definida
 */

const templates = require('../../templates/base');
const { v4: uuidv4 } = require('uuid');

class BuilderAgent {
  constructor() {
    this.positionX = -2800;
    this.positionY = 300;
    this.spacing = 240;
  }

  /**
   * Gera workflow JSON completo
   */
  build(spec, architecture) {
    console.log('Builder Agent: Construindo workflow JSON...\n');

    const nodes = this.buildNodes(spec, architecture);
    const connections = this.buildConnections(architecture, nodes);

    const workflow = {
      name: this.generateWorkflowName(spec),
      nodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1',
        binaryMode: 'separate',
        availableInMCP: false
      },
      tags: [{ name: 'generated' }]
    };

    console.log(`Workflow construido: ${nodes.length} nodes, ${Object.keys(connections).length} conexoes\n`);
    console.log('='.repeat(60) + '\n');

    return workflow;
  }

  buildNodes(spec, architecture) {
    const nodes = [];

    architecture.nodes.forEach(nodeSpec => {
      let node = null;

      switch (nodeSpec.type) {
        case 'n8n-nodes-base.webhook':
          node = this.buildWebhookNode(spec, nodeSpec);
          break;
        case 'n8n-nodes-base.set':
          node = this.buildExtractNode(spec, nodeSpec);
          break;
        case 'n8n-nodes-base.code':
          node = this.buildCodeNode(spec, nodeSpec);
          break;
        case 'n8n-nodes-base.httpRequest':
          node = this.buildHttpRequestNode(spec, nodeSpec);
          break;
      }

      if (node) {
        nodes.push(node);
      }
    });

    return nodes;
  }

  buildWebhookNode(spec, nodeSpec) {
    const path = this.generateWebhookPath(spec);

    return {
      parameters: {
        path,
        httpMethod: 'POST',
        responseMode: 'onReceived',
        options: {}
      },
      id: uuidv4(),
      name: nodeSpec.name,
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2.1,
      position: this.nextPosition(),
      webhookId: uuidv4()
    };
  }

  buildExtractNode(spec, nodeSpec) {
    const assignments = this.generateAssignments(spec);

    return {
      parameters: {
        assignments: {
          assignments
        },
        options: {}
      },
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name
    };
  }

  buildCodeNode(spec, nodeSpec) {
    let jsCode = '';

    if (nodeSpec.name.includes('Normalize')) {
      jsCode = this.generateNormalizationCode(spec);
    } else if (nodeSpec.name.includes('Map')) {
      jsCode = this.generateMappingCode(spec, nodeSpec);
    }

    return {
      parameters: {
        jsCode
      },
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name
    };
  }

  buildHttpRequestNode(spec, nodeSpec) {
    const integration = spec.integracoes.find(i => i.tipo.includes('destination'));

    if (!integration) {
      throw new Error('Nenhuma integracao de destino encontrada na SPEC');
    }

    const { url, method, body } = this.determineEndpoint(spec);

    const headers = method === 'PATCH'
      ? templates.COMMON_HEADERS.destinationPatch
      : templates.COMMON_HEADERS.destinationJson;

    return {
      parameters: {
        url,
        method,
        authentication: 'genericCredentialType',
        genericAuthType: 'httpBasicAuth',
        sendHeaders: true,
        headerParameters: {
          parameters: headers
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: body,
        options: {}
      },
      type: 'n8n-nodes-base.httpRequest',
      typeVersion: 4.3,
      position: this.nextPosition(),
      id: uuidv4(),
      name: nodeSpec.name,
      credentials: {
        httpBasicAuth: templates.CREDENTIALS.destinationAuth
      }
    };
  }

  determineEndpoint(spec) {
    if (spec.objetivo.includes('Criar Issue')) {
      return {
        url: '={{$env.PROJECT_API_URL}}/workitems/$Issue?api-version=7.0',
        method: 'PATCH',
        body: this.generateCreateIssueBody()
      };
    }

    if (spec.objetivo.includes('estado') || spec.objetivo.includes('state')) {
      return {
        url: '={{$env.PROJECT_API_URL}}/workitems/{{$json.external_id}}?api-version=7.1',
        method: 'PATCH',
        body: '=[{"op": "add","path": "/fields/System.State","value": "{{ $json.newState }}"}]'
      };
    }

    if (spec.objetivo.includes('comentario') || spec.objetivo.includes('comment')) {
      return {
        url: '={{$env.PROJECT_API_URL}}/workItems/{{$json.external_id}}/comments?api-version=7.1-preview.3',
        method: 'POST',
        body: '={ "text": "[Support] {{$json.comment}}" }'
      };
    }

    return {
      url: '={{$env.PROJECT_API_URL}}/workitems/$Issue?api-version=7.0',
      method: 'POST',
      body: '{}'
    };
  }

  generateCreateIssueBody() {
    return `={{ JSON.stringify([
  { op: "add", path: "/fields/System.Title", value: $json.title },
  { op: "add", path: "/fields/System.Description", value: $json.description },
  { op: "add", path: "/fields/Custom.Email", value: $json.email || "-" },
  { op: "add", path: "/fields/Custom.ExternalID", value: $json.externalId || "-" },
  { op: "add", path: "/fields/Custom.Platform", value: $json.platform },
  { op: "add", path: "/fields/System.Tags", value: ['n8n', $json.tag].filter(Boolean).join('; ')}
]) }}`;
  }

  generateAssignments(spec) {
    const assignments = [];

    spec.entradaEsperada.camposObrigatorios.forEach(field => {
      const fieldName = this.extractFieldName(field);
      assignments.push({
        id: uuidv4(),
        name: fieldName,
        value: `={{ $json.${field} }}`,
        type: 'string'
      });
    });

    return assignments;
  }

  extractFieldName(fieldPath) {
    const parts = fieldPath.split('.');
    return parts[parts.length - 1].replace(/[[\]'"]/g, '');
  }

  generateNormalizationCode(spec) {
    return `const c = $json;

// Detect platform by last seen timestamp
const iosSeen = Number(c.ios_last_seen_at || 0);
const androidSeen = Number(c.android_last_seen_at || 0);
const webSeen = c.browser ? Number(c.last_seen_at || 0) : 0;

const maxSeen = Math.max(iosSeen, androidSeen, webSeen);

let platform = 'unknown';
let osVersion = null;
let appVersion = null;

if (maxSeen === iosSeen && iosSeen > 0) {
  platform = 'iOS';
  osVersion = c.ios_os_version || null;
  appVersion = c.ios_app_version || null;
} else if (maxSeen === androidSeen && androidSeen > 0) {
  platform = 'Android';
  osVersion = c.android_os_version || null;
  appVersion = c.android_app_version || null;
} else if (maxSeen === webSeen && webSeen > 0) {
  platform = 'Web';
  osVersion = c.browser_version || null;
}

return [{ json: { ...c, platform, osVersion, appVersion } }];`;
  }

  generateMappingCode(spec, nodeSpec) {
    const mapping = spec.mapeamentos.find(m => nodeSpec.name.includes(m.tipo));

    if (!mapping) {
      return '// Mapeamento nao especificado\nreturn [$json];';
    }

    if (mapping.tipo.includes('Estado')) {
      return `// State mapping between systems
// Each key-value pair maps source state ID to destination state name
const map = {
  "1001": "To Do",
  "1002": "In Progress",
  "1003": "Review",
  "1004": "Ready",
  "1005": "On Hold",
  "1006": "Done",
};

const newState = map[String($json.ticket_state)];

if (!newState) {
  throw new Error("ticket_state nao mapeado: " + $json.ticket_state);
}

return [{ ...$json, newState }];`;
    }

    if (mapping.tipo.includes('Tag')) {
      return `const item = $input.first()?.json?.body?.data?.item ?? {};
const type = item?.ticket_type?.name ?? null;

// Maps ticket categories to project tags
const tagMap = {
  "Payments": "project-payments",
  "Catalog": "project-catalog",
  "Analytics": "project-analytics",
  "Inventory": "project-inventory",
  "General": "project-general"
};

const normalizedType = type?.trim?.();
const tag = normalizedType && tagMap.hasOwnProperty(normalizedType)
  ? tagMap[normalizedType]
  : null;

return [{ json: { tag } }];`;
    }

    return '// Generic mapping\nreturn [$json];';
  }

  generateWebhookPath(spec) {
    return spec.trigger.event.replace('.', '-');
  }

  generateWorkflowName(spec) {
    const source = spec.integracoes.find(i => i.tipo.includes('source'))?.nome || 'Source';
    const dest = spec.integracoes.find(i => i.tipo.includes('destination'))?.nome || 'Destination';

    return `${source} -> ${dest} | ${this.extractAction(spec.objetivo)}`;
  }

  extractAction(objective) {
    if (objective.includes('Criar')) return 'Create Issue';
    if (objective.includes('Sincronizar estado')) return 'Sync State';
    if (objective.includes('comentario')) return 'Sync Comments';
    if (objective.includes('tag')) return 'Sync Tags';
    return 'Integration';
  }

  buildConnections(architecture, nodes) {
    const connections = {};

    architecture.conexoes.forEach(conn => {
      const fromNode = nodes.find(n => n.name.includes(conn.from) || conn.from.includes('webhook'));
      const toNode = nodes.find(n => n.name.includes(conn.to) || conn.to === nodes[nodes.indexOf(fromNode) + 1]?.id);

      if (fromNode && toNode) {
        connections[fromNode.name] = {
          main: [[{
            node: toNode.name,
            type: 'main',
            index: 0
          }]]
        };
      }
    });

    return connections;
  }

  nextPosition() {
    const pos = [this.positionX, this.positionY];
    this.positionX += this.spacing;
    return pos;
  }
}

module.exports = BuilderAgent;
