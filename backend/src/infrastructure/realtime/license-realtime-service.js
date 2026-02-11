/**
 * License Realtime Service
 * Emits WebSocket events when license data changes (sync complete, bulk operations).
 * Used by license-sync-scheduler and license-controller.
 */
import logger from '../config/logger.js';

export class LicenseRealtimeService {
  constructor(io = null) {
    this.io = io;
  }

  /**
   * Attach Socket.IO server instance (called after server starts)
   */
  attach(io) {
    this.io = io;
  }

  /**
   * Emit license:sync_complete when sync job finishes
   * @param {Object} payload - { timestamp, duration, created, updated, failed, success }
   */
  emitSyncComplete(payload) {
    if (!this.io || !this.io.emit) return;

    try {
      this.io.emit('license:sync_complete', {
        timestamp: payload.timestamp || new Date().toISOString(),
        duration: payload.duration ?? 0,
        created: payload.created ?? 0,
        updated: payload.updated ?? 0,
        failed: payload.failed ?? 0,
        success: payload.success ?? false,
      });
      logger.debug('Emitted license:sync_complete', {
        timestamp: payload.timestamp,
        created: payload.created,
        updated: payload.updated,
      });
    } catch (err) {
      logger.warn('Failed to emit license:sync_complete', { error: err.message });
    }
  }

  /**
   * Emit license:data_changed when bulk/create/update/delete modifies data
   * @param {Object} payload - { source: 'bulk_update'|'bulk_create'|'bulk_delete'|'single_update', ids?: string[] }
   */
  emitDataChanged(payload) {
    if (!this.io || !this.io.emit) return;

    try {
      this.io.emit('license:data_changed', {
        source: payload.source || 'bulk_update',
        ids: payload.ids,
      });
      logger.debug('Emitted license:data_changed', { source: payload.source });
    } catch (err) {
      logger.warn('Failed to emit license:data_changed', { error: err.message });
    }
  }
}
