# VaultKey Threat Model (STRIDE Methodology)

## 1. Scope & System Boundaries
VaultKey is an offline-first password and credential manager for Android.
The security boundary separates the **Trusted Execution Environment / Native Android Security Layer** from the **User Interface (React Native)**, **Host Android OS**, and **External Applications**.

---

## 2. STRIDE Threat Analysis

| Category | Threat Description | Attack Vector | VaultKey Countermeasure |
| :--- | :--- | :--- | :--- |
| **S**poofing | Attacker creates a malicious app or phishing website to harvest credentials. | Displaying a fake login prompt matching a known bank or service. | **Anti-Phishing Domain Matcher**: Enforces strict eTLD+1 canonical URL parsing. Matching requires both domain identity and valid Android package signatures. Autofill datasets require biometric unlock. |
| **T**ampering | Attacker tampers with the local encrypted database file on disk. | Modifying SQLite ciphertext blocks or injecting corrupt records. | **AEAD & SQLCipher Page HMACs**: SQLCipher authenticates every 4096-byte database page using HMAC-SHA512. Encrypted backups use AES-256-GCM with 128-bit authentication tags. Any byte alteration triggers immediate verification failure. |
| **R**epudiation | Malicious action performed without audit visibility. | Secret viewed, exported, or deleted without user trace. | **Tamper-Evident Audit Logging**: Every secret read, copy, export, failed unlock attempt, and master password change is logged to `audit_log` table with timestamp and event classification. |
| **I**nformation Disclosure | Physical loss or theft of device; extraction of storage. | Accessing device storage or pulling raw `vaultkey.db` over ADB. | **Zero-Knowledge Envelope Encryption**: Master password never stored. Key derived via Argon2id (64MB memory hardness). Database encrypted at rest with AES-256 DEK. Memory wiping (`MemorySecurity.wipe`) after every cryptographic cycle. |
| **I**nformation Disclosure | Screen recording or snooping via Recent Apps switcher. | Malicious background app recording screen or inspecting OS app switcher. | **FLAG_SECURE**: Window is flagged with `WindowManager.LayoutParams.FLAG_SECURE`, blocking OS screenshots, screencasting, and preview thumbnails. |
| **I**nformation Disclosure | Stale secrets remaining on the system clipboard. | Malicious app reading clipboard history. | **Automated Clipboard Purging**: Native timer automatically overwrites and purges clipboard contents after 30 seconds. |
| **D**enial of Service | Rapid automated brute-force attacks against master password. | Automated dictionary attack on unlock screen. | **Argon2id Work Factor & Exponential Backoff**: Argon2id requires 64MB RAM and intensive CPU compute per attempt, limiting automated brute-force to ~2-3 attempts/second even on high-end hardware. Unlock UI enforces progressive lockouts after failed attempts. |
| **E**levation of Privilege | Compromised React Native JavaScript thread. | Attacker exploits an npm dependency to inspect JS heap memory. | **Zero Secrets in JavaScript Store**: Decrypted passwords and private notes are never stored in Redux/Zustand/AsyncStorage/MMKV. Secrets are fetched on-demand for transient display and purged immediately when navigated away. |

---

## 3. Adversary Capabilities & Residual Risks

### Considered Adversaries:
1. **Device Thief / Opportunistic Finder**:
   - Capabilities: Physical device in locked or unpowered state.
   - Result: **Impenetrable**. Data at rest is encrypted with AES-256 SQLCipher; key is derived via 64MB Argon2id.
2. **Co-installed Malicious App (Non-Rooted Device)**:
   - Capabilities: Can read system clipboard, request permissions, observe public broadcasts.
   - Result: **Protected**. App sandboxing, FLAG_SECURE, autofill dataset security, and 30-second clipboard clearing prevent data exfiltration.
3. **Phishing Site / Malicious Web View**:
   - Capabilities: Presenting a fake domain like `accounts.google.com.attacker.com`.
   - Result: **Protected**. Domain canonicalization detects the actual eTLD+1 as `attacker.com` and refuses to autofill credentials for `google.com`.

### Out-of-Scope / Residual Risks:
- **Compromised Root / Malicious Kernel**: If the host Android kernel is rooted and compromised with a kernel-level debugger or memory-scraping rootkit, runtime physical memory can theoretically be examined while the vault is active and unlocked. VaultKey mitigates this window by auto-locking after inactivity and zeroizing keys immediately.
