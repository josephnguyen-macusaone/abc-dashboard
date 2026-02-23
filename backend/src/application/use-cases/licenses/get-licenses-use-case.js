/**
 * Get Licenses Use Case
 * Handles retrieving licenses with pagination and filtering.
 * Enriches internal licenses with ActivateDate and smsBalance from external_licenses when internal values are missing or default.
 */
import { LicenseListResponseDto, LicenseResponseDto } from '../../dto/license/index.js';
import { PaginationDto } from '../../dto/common/index.js';
import logger from '../../../infrastructure/config/logger.js';

export class GetLicensesUseCase {
  constructor(licenseRepository, externalLicenseRepository = null) {
    this.licenseRepository = licenseRepository;
    this.externalLicenseRepository = externalLicenseRepository;
  }

  /** Parse external ActivateDate to ISO date string. */
  _parseExternalActivateDate(extDate) {
    if (!extDate) {
      return null;
    }
    if (typeof extDate === 'string' && extDate.includes('/')) {
      const [m, d, y] = extDate.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    if (extDate instanceof Date) {
      return extDate.toISOString().slice(0, 10);
    }
    return String(extDate).slice(0, 10);
  }

  /** Merge startsAt from external when internal is empty or today (default). */
  _mergeStartsAt(license, external, today) {
    const internalStartsAt = license.startsAt ? String(license.startsAt).slice(0, 10) : '';
    if (internalStartsAt && internalStartsAt !== today) {
      return;
    }
    const parsed = this._parseExternalActivateDate(external.ActivateDate);
    if (parsed) {
      license.startsAt = parsed;
    }
  }

  /** Merge smsBalance from external when internal is 0 or missing. */
  _mergeSmsBalance(license, external) {
    const internalSms = Number(license.smsBalance);
    const externalSms = Number(external.smsBalance);
    const shouldMerge =
      (internalSms === 0 || Number.isNaN(internalSms)) &&
      !Number.isNaN(externalSms) &&
      externalSms !== 0;
    if (shouldMerge) {
      license.smsBalance = externalSms;
    }
  }

  /** Merge notes from external when internal is empty. */
  _mergeNotes(license, external) {
    const internalNotes = license.notes;
    const externalNote = external.Note ?? external.note;
    const internalEmpty = !internalNotes || String(internalNotes).trim() === '';
    const externalHasValue =
      externalNote !== undefined && externalNote !== null && String(externalNote).trim() !== '';
    if (internalEmpty && externalHasValue) {
      license.notes = typeof externalNote === 'string' ? externalNote : String(externalNote);
    }
  }

  /**
   * Enrich license DTOs with startsAt, smsBalance, and notes from external_licenses when internal has wrong/default values.
   * @param {Object[]} licenses - License DTOs (plain objects with startsAt, smsBalance, appid, key)
   * @param {Map<string, ExternalLicense>} externalByAppid - Map of lowercase appid -> external license
   */
  _enrichFromExternal(licenses, externalByAppid) {
    const today = new Date().toISOString().slice(0, 10);

    for (const license of licenses) {
      const lookupKey = (license.appid || license.key || '').toString().trim().toLowerCase();
      if (!lookupKey) {
        continue;
      }

      const external = externalByAppid.get(lookupKey);
      if (!external) {
        continue;
      }

      this._mergeStartsAt(license, external, today);
      this._mergeSmsBalance(license, external);
      this._mergeNotes(license, external);
    }
  }

  /** Map repository result to license DTOs. */
  _toLicenseDtos(licenses) {
    return (licenses || []).map((license) => LicenseResponseDto.fromEntity(license));
  }

  /** Enrich licenses from external_licenses when repository is available. */
  async _enrichLicensesFromExternal(licenses) {
    const hasExternal = !!this.externalLicenseRepository;
    const hasLicenses = licenses.length > 0;
    if (!hasExternal || !hasLicenses) {
      return;
    }

    try {
      const appids = licenses.map((l) => l.appid || l.key).filter(Boolean);
      const externalByAppid = await this.externalLicenseRepository.findByAppIds(appids);
      this._enrichFromExternal(licenses, externalByAppid);
    } catch (enrichErr) {
      logger.warn('Enrich licenses from external failed (non-fatal)', {
        error: enrichErr.message,
      });
    }
  }

  /** Build LicenseListResponseDto from result and license DTOs. */
  _buildResponseDto(result, licenses, total, limit) {
    const totalPages = result.totalPages ?? Math.ceil(total / limit);
    return new LicenseListResponseDto({
      licenses,
      pagination: new PaginationDto({
        page: result.page,
        limit,
        totalPages,
      }),
      total,
      stats: result.stats,
    });
  }

  /** Log execute entry and fetch result. */
  async _fetchLicenses(options) {
    const filters = options.filters || {};
    logger.debug('GetLicensesUseCase.execute called', {
      hasFilters: Object.keys(filters).length > 0,
      filters: Object.keys(filters),
    });
    const result = await this.licenseRepository.findLicenses(options);
    logger.debug('GetLicensesUseCase repository returned', {
      licensesCount: result?.licenses?.length ?? 0,
      total: result?.total,
      statsTotal: result?.stats?.total,
      page: result?.page,
      totalPages: result?.totalPages,
    });
    return result;
  }

  /**
   * Execute get licenses use case
   * @param {Object} options - Query options (page, limit, filters, sortBy, sortOrder)
   * @returns {Promise<LicenseListResponseDto>} Paginated list of licenses
   */
  async execute(options = {}) {
    try {
      const result = await this._fetchLicenses(options);
      const total = result.stats?.total ?? 0;
      const limit = options.limit ?? 10;
      const licenses = this._toLicenseDtos(result.licenses);

      await this._enrichLicensesFromExternal(licenses);

      const responseDto = this._buildResponseDto(result, licenses, total, limit);

      logger.debug('GetLicensesUseCase returning DTO', {
        licensesCount: responseDto.licenses?.length ?? 0,
        total: responseDto.total,
        paginationTotalPages: responseDto.pagination?.totalPages,
      });

      return responseDto;
    } catch (error) {
      logger.error('GetLicensesUseCase error', { error: error.message, stack: error.stack });
      throw new Error(`Failed to get licenses: ${error.message}`);
    }
  }
}
