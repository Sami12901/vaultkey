/**
 * Shannon / Bit Entropy and Master Password Complexity Validator
 * Enforces strict cryptographic entropy standards (minimum 60 bits and length >= 12)
 */

export interface EntropyResult {
  entropy: number;
  score: number; // 0 to 4
  label: string;
  color: string;
  isLengthValid: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  isEntropySafe: boolean;
  isValidMasterPassword: boolean;
  feedback: string[];
}

export function calculatePasswordEntropy(password: string): EntropyResult {
  if (!password || password.length === 0) {
    return {
      entropy: 0,
      score: 0,
      label: 'Empty',
      color: '#64748B',
      isLengthValid: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSymbol: false,
      isEntropySafe: false,
      isValidMasterPassword: false,
      feedback: ['Enter a master password'],
    };
  }

  const length = password.length;
  const isLengthValid = length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  let poolSize = 0;
  if (hasLowercase) poolSize += 26;
  if (hasUppercase) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  // Base Shannon entropy in bits: L * log2(R)
  let rawEntropy = length * (Math.log(Math.max(poolSize, 2)) / Math.log(2));

  // Deduct penalty for repetitive characters (e.g. "aaaaa")
  const charFreq: Record<string, number> = {};
  for (const ch of password) {
    charFreq[ch] = (charFreq[ch] || 0) + 1;
  }
  let repeatDeduction = 0;
  for (const ch in charFreq) {
    if (charFreq[ch] > 1) {
      repeatDeduction += (charFreq[ch] - 1) * 3;
    }
  }

  // Deduct penalty for sequential patterns (e.g. 1234, abcd)
  let sequenceDeduction = 0;
  const lower = password.toLowerCase();
  for (let i = 0; i < lower.length - 2; i++) {
    const c1 = lower.charCodeAt(i);
    const c2 = lower.charCodeAt(i + 1);
    const c3 = lower.charCodeAt(i + 2);
    if ((c2 === c1 + 1 && c3 === c2 + 1) || (c2 === c1 - 1 && c3 === c2 - 1)) {
      sequenceDeduction += 5;
    }
  }

  // Deduct penalty if only one or two character classes are used
  const classCount =
    (hasUppercase ? 1 : 0) +
    (hasLowercase ? 1 : 0) +
    (hasNumber ? 1 : 0) +
    (hasSymbol ? 1 : 0);

  if (classCount <= 1) {
    rawEntropy *= 0.6;
  } else if (classCount === 2) {
    rawEntropy *= 0.8;
  }

  const finalEntropy = Math.max(0, Math.round(rawEntropy - repeatDeduction - sequenceDeduction));

  const isEntropySafe = finalEntropy >= 60;
  const isValidMasterPassword = isLengthValid && isEntropySafe && classCount >= 3;

  let score = 0;
  let label = 'Very Weak';
  let color = '#EF4444'; // Red

  if (finalEntropy >= 80 && isLengthValid && classCount >= 3) {
    score = 4;
    label = 'Very Strong';
    color = '#10B981'; // Emerald
  } else if (finalEntropy >= 60 && isLengthValid) {
    score = 3;
    label = 'Strong';
    color = '#10B981'; // Emerald
  } else if (finalEntropy >= 45) {
    score = 2;
    label = 'Moderate';
    color = '#F59E0B'; // Amber
  } else if (finalEntropy >= 25) {
    score = 1;
    label = 'Weak';
    color = '#F97316'; // Orange
  } else {
    score = 0;
    label = 'Very Weak';
    color = '#EF4444'; // Red
  }

  const feedback: string[] = [];
  if (!isLengthValid) {
    feedback.push('Must be at least 12 characters');
  }
  if (classCount < 3) {
    feedback.push('Include a mix of uppercase, numbers, and symbols');
  }
  if (!isEntropySafe && isLengthValid) {
    feedback.push('Entropy is too low (minimum 60 bits required)');
  }

  return {
    entropy: finalEntropy,
    score,
    label,
    color,
    isLengthValid,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol,
    isEntropySafe,
    isValidMasterPassword,
    feedback,
  };
}

