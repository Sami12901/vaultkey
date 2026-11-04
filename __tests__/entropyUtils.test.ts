import { calculatePasswordEntropy } from '../src/utils/entropyUtils';

describe('calculatePasswordEntropy', () => {
  it('returns zero entropy and invalid for empty password', () => {
    const res = calculatePasswordEntropy('');
    expect(res.entropy).toBe(0);
    expect(res.score).toBe(0);
    expect(res.isValidMasterPassword).toBe(false);
    expect(res.isLengthValid).toBe(false);
  });

  it('rejects short passwords even if diverse', () => {
    const res = calculatePasswordEntropy('A1!b2@');
    expect(res.isLengthValid).toBe(false);
    expect(res.isValidMasterPassword).toBe(false);
    expect(res.feedback).toContain('Must be at least 12 characters');
  });

  it('rejects 12-character repetitive weak passwords', () => {
    const res = calculatePasswordEntropy('aaaaaaaaaaaa');
    expect(res.isLengthValid).toBe(true);
    expect(res.isEntropySafe).toBe(false);
    expect(res.isValidMasterPassword).toBe(false);
    expect(res.score).toBeLessThanOrEqual(1);
  });

  it('rejects 12-character sequential weak passwords', () => {
    const res = calculatePasswordEntropy('123456789012');
    expect(res.isLengthValid).toBe(true);
    expect(res.isEntropySafe).toBe(false);
    expect(res.isValidMasterPassword).toBe(false);
  });

  it('accepts strong master passwords with length >= 12 and entropy >= 60 bits', () => {
    const res = calculatePasswordEntropy('K9#vL2$mP8!xQ4@z');
    expect(res.isLengthValid).toBe(true);
    expect(res.isEntropySafe).toBe(true);
    expect(res.entropy).toBeGreaterThanOrEqual(60);
    expect(res.isValidMasterPassword).toBe(true);
    expect(res.score).toBeGreaterThanOrEqual(3);
  });
});
