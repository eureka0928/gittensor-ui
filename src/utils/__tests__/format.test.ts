import { formatTokenAmount, formatUsdEstimate } from '../format';

// --------------- formatTokenAmount ---------------

describe('formatTokenAmount', () => {
  it('returns "0" for null', () => {
    expect(formatTokenAmount(null)).toBe('0');
  });

  it('returns "0" for undefined', () => {
    expect(formatTokenAmount(undefined)).toBe('0');
  });

  it('formats a number', () => {
    const result = formatTokenAmount(1234.567);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats a string number', () => {
    const result = formatTokenAmount('100.5');
    expect(result).toContain('100');
  });

  it('returns "0" for NaN string', () => {
    expect(formatTokenAmount('abc')).toBe('0');
  });

  it('respects custom decimals', () => {
    const result = formatTokenAmount(100.123456, 4);
    expect(result).toContain('1235');
  });
});

// --------------- formatUsdEstimate ---------------

describe('formatUsdEstimate', () => {
  it('returns null for null value', () => {
    expect(formatUsdEstimate(null)).toBeNull();
  });

  it('returns null for undefined value', () => {
    expect(formatUsdEstimate(undefined)).toBeNull();
  });

  it('returns null for zero by default', () => {
    expect(formatUsdEstimate(0)).toBeNull();
  });

  it('returns $0 when showZero is true', () => {
    expect(formatUsdEstimate(0, { showZero: true })).toBe('$0');
  });

  it('returns <$1 for fractional values', () => {
    expect(formatUsdEstimate(0.5)).toBe('<$1');
  });

  it('returns rounded dollar for >= 1', () => {
    expect(formatUsdEstimate(5.7)).toBe('$6');
  });

  it('includes approx prefix when requested', () => {
    expect(
      formatUsdEstimate(10, { includeApproxPrefix: true }),
    ).toBe('~$10');
  });

  it('includes approx prefix with showZero', () => {
    expect(
      formatUsdEstimate(0, {
        includeApproxPrefix: true,
        showZero: true,
      }),
    ).toBe('~$0');
  });
});
