import { describe, it, expect } from 'vitest';
import { normalizePartNumber, stripKnownPrefix, extractPrefix } from '../prefix-normalizer';

describe('normalizePartNumber', () => {
  it('removes spaces and dashes, uppercases', () => {
    expect(normalizePartNumber('c315-3545')).toBe('C3153545');
  });

  it('handles empty string', () => {
    expect(normalizePartNumber('')).toBe('');
  });

  it('trims whitespace', () => {
    expect(normalizePartNumber('  B422  ')).toBe('B422');
  });

  it('normalizes CMD prefix with space', () => {
    expect(normalizePartNumber('CMD 4636001')).toBe('CMD4636001');
  });
});

describe('stripKnownPrefix', () => {
  it('strips CMI- prefix', () => {
    expect(stripKnownPrefix('CMI-B5662')).toBe('B5662');
  });

  it('strips BER- prefix', () => {
    expect(stripKnownPrefix('BER-A1234')).toBe('A1234');
  });

  it('strips LIN- prefix', () => {
    expect(stripKnownPrefix('LIN-C100-1015')).toBe('C100-1015');
  });

  it('strips CMUC prefix', () => {
    expect(stripKnownPrefix('CMUC315-3545')).toBe('315-3545');
  });

  it('strips CMD prefix', () => {
    expect(stripKnownPrefix('CMD 4636001')).toBe('4636001');
  });

  it('returns unchanged if no known prefix', () => {
    expect(stripKnownPrefix('B422')).toBe('B422');
  });

  it('handles empty string', () => {
    expect(stripKnownPrefix('')).toBe('');
  });
});

describe('extractPrefix', () => {
  it('detects CMI prefix', () => {
    expect(extractPrefix('CMI-B5662')).toBe('CMI');
  });

  it('detects CMUC prefix', () => {
    expect(extractPrefix('CMUC315-3545')).toBe('CMUC');
  });

  it('detects CMD prefix', () => {
    expect(extractPrefix('CMD 4636001')).toBe('CMD');
  });

  it('returns null for no prefix', () => {
    expect(extractPrefix('B422')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractPrefix('')).toBeNull();
  });
});
