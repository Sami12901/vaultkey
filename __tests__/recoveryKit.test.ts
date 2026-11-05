import {
  generateFormattedRecoveryKey,
  computeKeyChecksum,
  verifyRecoveryKeyChecksum,
  generateEmergencyKitContent,
  parseEmergencyKit,
} from '../src/utils/recoveryKit';

describe('Emergency Access & Digital Recovery Kit', () => {
  describe('Key Formatting and Checksum Validation', () => {
    it('generates a 32-character key grouped into 8 chunks of 4 characters', () => {
      const keyData = generateFormattedRecoveryKey();
      expect(keyData.rawKey).toHaveLength(32);
      expect(keyData.formattedKey).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      expect(keyData.checksum).toHaveLength(4);
    });

    it('formats an existing 32-character key accurately', () => {
      const raw = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const keyData = generateFormattedRecoveryKey(raw);
      expect(keyData.rawKey).toBe(raw);
      expect(keyData.formattedKey).toBe('9K7D-M4XW-2F8P-HQ3R-V7YT-5NLE-8BPA-6MCZ');
    });

    it('computes deterministic 4-character checksum', () => {
      const key = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const checksum = computeKeyChecksum(key);
      expect(checksum).toHaveLength(4);
      expect(computeKeyChecksum(key)).toBe(checksum);
    });

    it('verifies valid checksum and rejects invalid or tampered checksum', () => {
      const key = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const validChecksum = computeKeyChecksum(key);
      expect(verifyRecoveryKeyChecksum(key, validChecksum)).toBe(true);
      expect(verifyRecoveryKeyChecksum(key, '0000')).toBe(false);
      expect(verifyRecoveryKeyChecksum('TAMPEREDKEY2F8PHQ3RV7YT5NLE8BPA', validChecksum)).toBe(false);
    });
  });

  describe('generateEmergencyKitContent', () => {
    it('produces formatted ASCII sheet with zero-knowledge notice and instructions', () => {
      const content = generateEmergencyKitContent({
        vaultName: 'Saif Enterprise Vault',
        userEmail: 'saif@vaultkey.app',
        hints: 'First pet name + year',
      });

      expect(content).toContain('VAULTKEY ZERO-KNOWLEDGE EMERGENCY KIT');
      expect(content).toContain('Vault Name     : Saif Enterprise Vault');
      expect(content).toContain('Account Holder : saif@vaultkey.app');
      expect(content).toContain('Key            : ');
      expect(content).toContain('Checksum       : [CRC: ');
      expect(content).toContain('Master Password Hint:');
      expect(content).toContain('First pet name + year');
      expect(content).toContain('SECURITY ARCHITECTURE & ZERO-KNOWLEDGE NOTICE');
      expect(content).toContain('EMERGENCY RECOVERY INSTRUCTIONS');
      expect(content).toContain('Restore from Emergency Kit');
    });
  });

  describe('parseEmergencyKit', () => {
    it('extracts recovery key and valid checksum from generated kit', () => {
      const rawKey = '9K7DM4XW2F8PHQ3RV7YT5NLE8BPA6MCZ';
      const content = generateEmergencyKitContent({ recoveryKey: rawKey });
      const parsed = parseEmergencyKit(content);

      expect(parsed.isValid).toBe(true);
      expect(parsed.recoveryKey).toBe(rawKey);
      expect(parsed.checksum).toBe(computeKeyChecksum(rawKey));
    });

    it('returns isValid: false for text without recovery key', () => {
      expect(parseEmergencyKit('random non-kit text')).toEqual({ isValid: false });
    });
  });
});
