/**
 * Mapping Agent
 *
 * Missao: Centralizar e validar todos os mapeamentos entre sistemas
 *
 * Responsabilidades:
 * - Validar mapeamentos bidirecionais de estado
 * - Validar ticket_type para tags
 * - Garantir consistencia bidirecional
 * - Impedir estados nao mapeados
 *
 * Regra obrigatoria:
 * Se valor nao estiver mapeado: throw new Error("Valor nao mapeado: " + original);
 */

class MappingAgent {
  constructor() {
    // Source -> Destination state mapping
    this.stateSourceToDestination = {
      "1001": "To Do",
      "1002": "In Progress",
      "1003": "Review",
      "1004": "Ready",
      "1005": "On Hold",
      "1006": "Done"
    };

    // Reverse mapping (Destination -> Source)
    this.stateDestinationToSource = this.reverseMap(this.stateSourceToDestination);

    // Ticket type -> Tag mapping
    this.ticketTypeToTag = {
      "Payments": "project-payments",
      "Catalog": "project-catalog",
      "Analytics": "project-analytics",
      "Inventory": "project-inventory",
      "General": "project-general"
    };
  }

  mapSourceStateToDestination(sourceStateId) {
    const destState = this.stateSourceToDestination[String(sourceStateId)];

    if (!destState) {
      throw new Error(`Valor nao mapeado (Source -> Destination): ${sourceStateId}`);
    }

    return destState;
  }

  mapDestinationStateToSource(destState) {
    const sourceStateId = this.stateDestinationToSource[destState];

    if (!sourceStateId) {
      throw new Error(`Valor nao mapeado (Destination -> Source): ${destState}`);
    }

    return sourceStateId;
  }

  mapTicketTypeToTag(ticketType) {
    const normalizedType = ticketType?.trim?.();

    if (!normalizedType) {
      return null; // Tag is optional
    }

    const tag = this.ticketTypeToTag[normalizedType];

    if (!tag && normalizedType) {
      console.warn(`Ticket type nao mapeado: "${ticketType}"`);
      return null;
    }

    return tag;
  }

  validateMapping(value, mapName) {
    const map = this[mapName];

    if (!map) {
      throw new Error(`Mapa nao encontrado: ${mapName}`);
    }

    return Object.keys(map).includes(String(value));
  }

  reverseMap(originalMap) {
    const reversed = {};
    for (const [key, value] of Object.entries(originalMap)) {
      reversed[value] = key;
    }
    return reversed;
  }

  getValidSourceStates() {
    return Object.keys(this.stateSourceToDestination);
  }

  getValidDestinationStates() {
    return Object.values(this.stateSourceToDestination);
  }

  getValidTicketTypes() {
    return Object.keys(this.ticketTypeToTag);
  }
}

module.exports = MappingAgent;
