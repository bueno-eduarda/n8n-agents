/**
 * Idempotency Agent
 *
 * Missao: Evitar duplicacoes e inconsistencias
 *
 * Responsabilidades:
 * - Verificar existencia de item antes de criar
 * - Garantir atualizacao deterministica
 * - Evitar reprocessamento indevido
 *
 * Decisao: Criar / Atualizar / Ignorar
 */

class IdempotencyAgent {
  constructor() {
    this.processedItems = new Map();
  }

  decide(context) {
    console.log('Idempotency Agent: Analisando contexto...\n');

    const { operation, ticketId, externalId, sourceId } = context;

    if (operation === 'create') {
      return this.decideCreate(ticketId, externalId);
    }

    if (operation === 'update') {
      return this.decideUpdate(ticketId, externalId);
    }

    if (operation === 'sync') {
      return this.decideSync(ticketId, sourceId, externalId);
    }

    return {
      action: 'create',
      reason: 'Operacao nao especificada'
    };
  }

  decideCreate(ticketId, externalId) {
    if (externalId) {
      console.log(`  Ticket ${ticketId} ja tem External ID: ${externalId}`);
      return {
        action: 'ignore',
        reason: 'Item ja existe no destino',
        externalId
      };
    }

    if (this.wasRecentlyProcessed(ticketId, 'create')) {
      console.log(`  Ticket ${ticketId} foi processado recentemente`);
      return {
        action: 'ignore',
        reason: 'Ticket processado recentemente (possivel duplicacao de webhook)',
        cacheHit: true
      };
    }

    this.markAsProcessed(ticketId, 'create');
    console.log(`  Pode criar item para ticket ${ticketId}`);

    return {
      action: 'create',
      reason: 'Ticket novo sem External ID'
    };
  }

  decideUpdate(ticketId, externalId) {
    if (!externalId) {
      console.log(`  Ticket ${ticketId} sem External ID - nao pode atualizar`);
      return {
        action: 'ignore',
        reason: 'Sem External ID para atualizar',
        error: true
      };
    }

    if (this.wasRecentlyProcessed(`${ticketId}-${externalId}`, 'update')) {
      console.log(`  Ticket ${ticketId} foi atualizado recentemente`);
      return {
        action: 'ignore',
        reason: 'Atualizacao recente (evitar loop)',
        cacheHit: true
      };
    }

    this.markAsProcessed(`${ticketId}-${externalId}`, 'update');
    console.log(`  Pode atualizar item ${externalId} do ticket ${ticketId}`);

    return {
      action: 'update',
      reason: 'Atualizacao valida',
      externalId
    };
  }

  decideSync(ticketId, sourceId, externalId) {
    if (!sourceId || !externalId) {
      return {
        action: 'ignore',
        reason: 'IDs incompletos para sincronizacao',
        error: true
      };
    }

    const syncKey = `${sourceId}-${externalId}`;

    if (this.wasRecentlyProcessed(syncKey, 'sync')) {
      console.log(`  Sincronizacao ${syncKey} recente - evitando loop`);
      return {
        action: 'ignore',
        reason: 'Sincronizacao recente (anti-loop)',
        cacheHit: true
      };
    }

    this.markAsProcessed(syncKey, 'sync');
    console.log(`  Pode sincronizar ${syncKey}`);

    return {
      action: 'sync',
      reason: 'Sincronizacao valida'
    };
  }

  wasRecentlyProcessed(key, operation) {
    const cacheKey = `${operation}:${key}`;
    const processed = this.processedItems.get(cacheKey);

    if (!processed) return false;

    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return processed.timestamp > fiveMinutesAgo;
  }

  markAsProcessed(key, operation) {
    const cacheKey = `${operation}:${key}`;
    this.processedItems.set(cacheKey, {
      timestamp: Date.now(),
      operation
    });

    setTimeout(() => {
      this.processedItems.delete(cacheKey);
    }, 10 * 60 * 1000);
  }

  clearCache() {
    this.processedItems.clear();
  }

  getStats() {
    return {
      cacheSize: this.processedItems.size,
      items: Array.from(this.processedItems.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
}

module.exports = IdempotencyAgent;
