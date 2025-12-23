import { formatDate } from '@/shared/lib/format'

describe('Format Utilities', () => {
  describe('formatDate', () => {
    const originalDateTimeFormat = Intl.DateTimeFormat

    beforeAll(() => {
      // Mock Intl.DateTimeFormat for consistent testing
      Intl.DateTimeFormat = jest.fn().mockImplementation((locale, options) => ({
        format: jest.fn((date: Date) => {
          const d = new Date(date)
          // Check if date is invalid (same as the real implementation)
          if (isNaN(d.getTime())) {
            throw new Error('Invalid date')
          }
          const month = d.toLocaleString('en-US', { month: 'long' })
          const day = d.getDate()
          const year = d.getFullYear()
          return `${month} ${day}, ${year}`
        })
      })) as any
    })

    afterAll(() => {
      // Restore original implementation
      Intl.DateTimeFormat = originalDateTimeFormat
    })

    it('should format a valid Date object', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = formatDate(date)

      expect(result).toBe('January 15, 2024')
    })

    it('should format a valid date string', () => {
      const dateString = '2024-01-15T10:30:00Z'
      const result = formatDate(dateString)

      expect(result).toBe('January 15, 2024')
    })

    it('should format a valid timestamp number', () => {
      const timestamp = Date.parse('2024-01-15T10:30:00Z')
      const result = formatDate(timestamp)

      expect(result).toBe('January 15, 2024')
    })

    it('should return empty string for undefined date', () => {
      const result = formatDate(undefined)

      expect(result).toBe('')
    })

    it('should return empty string for null date', () => {
      const result = formatDate(null as any)

      expect(result).toBe('')
    })

    it('should return empty string for empty string', () => {
      const result = formatDate('')

      expect(result).toBe('')
    })

    it('should return empty string for invalid date string', () => {
      const result = formatDate('invalid-date')

      expect(result).toBe('')
    })

    it('should handle custom formatting options', () => {
      const date = new Date('2024-01-15T10:30:00Z')

      // Mock a different formatter for custom options
      const mockFormatter = jest.spyOn(Intl, 'DateTimeFormat')
        .mockImplementationOnce((locale, options) => ({
          format: (date: Date) => 'Custom Format'
        } as Intl.DateTimeFormat))

      const result = formatDate(date, { month: 'short', day: '2-digit' })

      expect(result).toBe('Custom Format')
      expect(mockFormatter).toHaveBeenCalledWith('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric'
      })
    })

    it('should use default options when no options provided', () => {
      const date = new Date('2024-01-15T10:30:00Z')

      const mockFormatter = jest.spyOn(Intl, 'DateTimeFormat')
        .mockImplementationOnce((locale, options) => ({
          format: (date: Date) => 'Default Format'
        } as Intl.DateTimeFormat))

      const result = formatDate(date)

      expect(result).toBe('Default Format')
      expect(mockFormatter).toHaveBeenCalledWith('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    })

    it('should gracefully handle Intl.DateTimeFormat errors', () => {
      const date = new Date('2024-01-15T10:30:00Z')

      // Mock Intl.DateTimeFormat to throw an error
      const mockFormatter = jest.spyOn(Intl, 'DateTimeFormat')
        .mockImplementationOnce(() => {
          throw new Error('Intl error')
        })

      const result = formatDate(date)

      expect(result).toBe('')
    })

    it('should handle edge case dates', () => {
      // Test with minimum date
      const minDate = new Date(0)
      const result1 = formatDate(minDate)
      expect(result1).toBeTruthy() // Should not be empty

      // Test with far future date
      const futureDate = new Date('2100-12-31T23:59:59Z')
      const result2 = formatDate(futureDate)
      expect(result2).toBeTruthy() // Should not be empty
    })
  })
})
