# Contributing to VaultKey

Thank you for your interest in contributing to **VaultKey**! We welcome contributions that help make VaultKey faster, more secure, and easier to use.

---

## Code of Conduct

All contributors and participants are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please treat all members of the community with respect and courtesy.

---

## Security Invariants (Important!)

VaultKey is a zero-knowledge security tool. When making any code changes, the following core invariants **must never be compromised**:

1. **Zero Plaintext Logging**: Never output passwords, master keys, tokens, or plaintext secrets via `console.log`, `Log.d`, `Log.e`, or any diagnostic utility.
2. **Memory Zeroization**: In native Kotlin/C++ code, always zeroize byte arrays and char arrays immediately after cryptographic operations using `MemorySecurity.wipe()`.
3. **No Network Leaks**: VaultKey is an offline-first application. Never add third-party analytics, telemetry, or remote dependencies that contact external servers without explicit, air-gapped user consent.
4. **Local Loopback Security**: The browser extension bridge must communicate strictly over local loopback (`127.0.0.1`) with origin checks.

If you suspect a security flaw in existing code, please follow the responsible disclosure process described in [SECURITY.md](SECURITY.md) instead of opening a public issue.

---

## Development Workflow

### 1. Fork & Branch
1. Fork the repository to your own GitHub account.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/<your-username>/vaultkey.git
   cd vaultkey
   ```
3. Create a feature branch with a descriptive name:
   ```bash
   git checkout -b feat/add-biometric-prompt
   # or
   git checkout -b fix/autofill-domain-parsing
   ```

### 2. Install Dependencies
```bash
npm install
```
If you are developing for the Windows desktop client:
```bash
cd windows
npm install
cd ..
```

### 3. Verification & Quality Gates
Before submitting a pull request, ensure all tests and linters pass cleanly:
```bash
# 1. Run unit test suite
npm test

# 2. Strict TypeScript type check
npx tsc --noEmit

# 3. Code linting
npm run lint
```

For changes in the `windows/` desktop package:
```bash
cd windows
npm run build
cd ..
```

---

## Pull Request Checklist

When submitting a PR, please verify:
- [ ] Code strictly follows TypeScript strict mode with no implicit `any`.
- [ ] No plaintext secrets or passwords are leaked in memory or logs.
- [ ] New features include relevant unit tests in `__tests__/`.
- [ ] All CI checks pass (`npm test`, `npx tsc --noEmit`, `npm run lint`).
- [ ] Commits have clear, descriptive messages (e.g. `feat: add password history tracking`, `fix: handle edge case in eTLD domain parser`).
