import {
  applyInternalMergePolicy,
  isInternalNewerThanLastExternalSync,
} from '../../../src/shared/utils/internal-license-external-sync-merge.js';

describe('internal-license-external-sync-merge', () => {
  const baseInternal = {
    id: 1,
    updatedAt: new Date('2026-03-15T12:00:00.000Z'),
    last_external_sync: new Date('2026-03-10T12:00:00.000Z'),
  };

  describe('isInternalNewerThanLastExternalSync', () => {
    it('returns true when updatedAt is after last_external_sync', () => {
      expect(isInternalNewerThanLastExternalSync(baseInternal)).toBe(true);
    });

    it('accepts lastExternalSync alias (camelCase)', () => {
      const lic = {
        updatedAt: new Date('2026-03-15T12:00:00.000Z'),
        lastExternalSync: new Date('2026-03-10T12:00:00.000Z'),
      };
      expect(isInternalNewerThanLastExternalSync(lic)).toBe(true);
    });

    it('returns false when internal is not newer', () => {
      const lic = {
        ...baseInternal,
        updatedAt: new Date('2026-03-09T12:00:00.000Z'),
      };
      expect(isInternalNewerThanLastExternalSync(lic)).toBe(false);
    });

    it('returns false when last sync is missing', () => {
      expect(isInternalNewerThanLastExternalSync({ updatedAt: new Date() })).toBe(false);
    });
  });

  describe('applyInternalMergePolicy', () => {
    it('strips web-managed keys when internal is newer than last external sync', () => {
      const raw = {
        dba: 'Ext DBA',
        zip: '90210',
        status: 'active',
        appid: 'A1',
        mid: 'M1',
      };
      const { updateData, preservedFields } = applyInternalMergePolicy(raw, baseInternal);
      expect(updateData.dba).toBeUndefined();
      expect(updateData.zip).toBeUndefined();
      expect(updateData.status).toBeUndefined();
      expect(updateData.appid).toBe('A1');
      expect(updateData.mid).toBe('M1');
      expect(preservedFields.sort()).toEqual(['dba', 'status', 'zip'].sort());
    });

    it('passes through all keys when internal is not newer', () => {
      const lic = {
        ...baseInternal,
        updatedAt: new Date('2026-03-09T12:00:00.000Z'),
      };
      const raw = { dba: 'Ext', appid: 'A1' };
      const { updateData, preservedFields } = applyInternalMergePolicy(raw, lic);
      expect(updateData).toEqual(raw);
      expect(preservedFields).toEqual([]);
    });
  });
});
