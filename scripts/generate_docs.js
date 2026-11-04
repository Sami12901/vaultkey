const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const securityMd = `# VaultKey Security Specification & Cryptographic Architecture

## 1. Executive Summary & Security Philosophy
VaultKey is an offline-first, zero-knowledge password and identity management system engineered exclusively for Android.
The foundational security invariant of VaultKey is:
> **Decryption secrets and master credentials must NEVER exist in unencrypted storage, network traffic, persistent JavaScript memory, application logs, or crash analytics.**

VaultKey enforces an envelope encryption model with hardware-backed biometric authentication, SQLCipher 256-bit database encryption, and memory-safe zeroization of all intermediate keys.

---

## 2. Cryptographic Specifications

### 2.1 Key Derivation Function (KDF): Argon2id
To defend against GPU/FPGA/ASIC brute-force attacks, VaultKey derives key encryption keys using RFC 9106 Argon2id implemented via Bouncy Castle (\`org.bouncycastle.crypto.generators.Argon2BytesGenerator\`).

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Algorithm** | Argon2id | Hybrid mode resistant to both side-channel and GPU attacks |
| **Iterations (\`t\`)** | 3 | Meets OWASP and NIST recommendations for mobile CPU limits |
| **Memory (\`m\`)** | 64 MB (\`65,536 KB\`) | High memory hardness defeating ASIC mass-parallelism |
| **Parallelism (\`p\`)** | 4 | Optimally matches modern multi-core mobile architectures |
| **Salt Size** | 32 bytes (256 bits) | Cryptographically secure random (\`SecureRandom\`) |
| **Output Key Length** | 32 bytes (256 bits) | Direct fit for AES-256-GCM |

### 2.2 Envelope Encryption & Key Hierarchy

\`\`\`
+-------------------------------------------------------------------+
|                         Master Password                           |
+-------------------------------------------------------------------+
                                  |
                                  v  (Argon2id KDF: 64MB, t=3, p=4)
+-------------------------------------------------------------------+
|                  Key Encryption Key (KEK - 256 bit)               |
+-------------------------------------------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v (Decryption)                              v (Biometrics enabled)
+-------------------------------+             +-------------------------------+
| Wrapped Database Key (WDEK)   |             | Android Keystore Master Key   |
| (AES-256-GCM encrypted)       |             | (StrongBox / TEE backed)      |
+-------------------------------+             +-------------------------------+
            |                                                   |
            v                                                   v
+-------------------------------------------------------------------+
|                 Data Encryption Key (DEK - 256 bit)               |
|            (Used for SQLCipher database at rest)                  |
+-------------------------------------------------------------------+
\`\`\`

1. **Data Encryption Key (DEK)**:
   - A cryptographically random 256-bit key generated upon vault initialization.
   - Used as the SQLCipher passphrase/PRAGMA key for the encrypted SQLite database.
2. **Key Encryption Key (KEK)**:
   - Derived from the user's Master Password + 32-byte salt using Argon2id.
   - Encrypts the DEK via AES-256-GCM.
3. **Master Password Rotation**:
   - When the user changes their Master Password, the DEK is **NOT** re-generated.
   - Only the wrapped DEK is re-encrypted with the new KEK.
   - The entire vault database does **not** need to be re-encrypted, preventing data corruption during rotation.
4. **Biometric Unlock**:
   - A random biometric DEK token is encrypted using an Android Keystore key with \`setUserAuthenticationRequired(true)\`.
   - StrongBox Keymaster is queried; if available, keys are bound to hardware security modules (HSM/SE).

### 2.3 Authenticated Symmetric Encryption: AES-256-GCM
All field-level secret encryption and encrypted backups utilize AES-256-GCM:
- **Cipher**: \`AES/GCM/NoPadding\`
- **Key Length**: 256 bits
- **IV / Nonce**: 96 bits (12 bytes), generated freshly for every encryption operation via \`SecureRandom\`
- **Tag Length**: 128 bits (16 bytes)
- **Container Format**: \`[ 12-byte IV ] || [ Ciphertext ] || [ 16-byte Auth Tag ]\`

---

## 3. Database Security (SQLCipher 4.x)
- **Engine**: SQLCipher Android Community Edition (\`net.zetetic:sqlcipher-android:4.6.1\`).
- **Algorithm**: AES-256 in CBC mode with per-page HMAC-SHA512 authentication.
- **Page Size**: 4096 bytes.
- **KDF Iterations**: 256,000 PBKDF2 iterations for page keys.
- **Zero-knowledge**: Without the DEK in memory, the SQLite file appears as high-entropy pseudorandom noise.

---

## 4. Memory Hygiene & Zeroization
Because the Android runtime utilizes garbage collection, strings can remain in heap memory for unpredictable durations. VaultKey applies strict memory defense:
- **CharArray & ByteArray**: All sensitive credentials in Kotlin are received as \`CharArray\` or \`ByteArray\`.
- **Zeroization**: \`MemorySecurity.wipe(ByteArray)\` and \`MemorySecurity.wipe(CharArray)\` overwrite arrays with zeroes (\`0x00\`) immediately after cryptographic derivation.
- **Native Bridge Isolation**: Secret fields (passwords, PINs, notes) are only decrypted on-demand when explicitly inspected by the user. Item lists and summaries sent over the React Native bridge only contain non-sensitive metadata (title, username, category, URLs, timestamps).
- **Auto-Lock Monotonic Timer**: A monotonic clock (\`SystemClock.elapsedRealtime()\`) tracks inactivity. The timer cannot be deceived by manipulating the device clock.

---

## 5. Screen Security & OS Protection
- **FLAG_SECURE**: Enabled across the application and during Autofill interaction.
  - Prevents screenshots and screen recording.
  - Prevents sensitive vault credentials from appearing in the Android Recent Apps thumbnail switcher.
- **Clipboard Auto-Clear**:
  - The native \`ClipboardModule\` uses a countdown timer (default: 30 seconds) to purge copied passwords from the Android system clipboard.
  - Clipboard text is cleared and verified.

---

## 6. Android Autofill Framework Security
VaultKey provides a dedicated native Android \`AutofillService\`:
1. **Zero-JavaScript Runtime**: \`VaultAutofillService\` operates entirely within native Kotlin without booting the React Native JavaScript engine, ensuring instant sub-100ms response and minimal memory footprint.
2. **Canonical Domain Matching (Anti-Phishing)**:
   - Web domains and Android package signatures are strictly validated.
   - Uses Public Suffix List (eTLD+1) logic to prevent subdomain spoofing (e.g. \`paypal.com.evil.com\` is never matched to \`paypal.com\`).
3. **Biometric Gate**: Autofill datasets require biometric or master-password authorization before releasing credentials to the requesting app.

---

## 7. Encrypted Backup Container Specification
VaultKey backups use an authenticated, portable binary container format:

| Offset | Field | Size | Description |
| :--- | :--- | :--- | :--- |
| \`0x00 - 0x07\` | Magic Header | 8 bytes | ASCII \`"VAULTKEY"\` |
| \`0x08 - 0x09\` | Version | 2 bytes | Short integer (e.g. \`0x0001\`) |
| \`0x0A - 0x29\` | Salt | 32 bytes | Random Argon2id salt |
| \`0x2A - 0x35\` | IV | 12 bytes | AES-GCM 96-bit nonce |
| \`0x36 - EOF\` | Ciphertext + Tag | Variable | AES-256-GCM encrypted JSON payload |

Backups can be restored with Merge or Replace options with pre-restore checksum and credential count validation.
`;

const threatModelMd = `# VaultKey Threat Model (STRIDE Methodology)

## 1. Scope & System Boundaries
VaultKey is an offline-first password and credential manager for Android.
The security boundary separates the **Trusted Execution Environment / Native Android Security Layer** from the **User Interface (React Native)**, **Host Android OS**, and **External Applications**.

---

## 2. STRIDE Threat Analysis

| Category | Threat Description | Attack Vector | VaultKey Countermeasure |
| :--- | :--- | :--- | :--- |
| **S**poofing | Attacker creates a malicious app or phishing website to harvest credentials. | Displaying a fake login prompt matching a known bank or service. | **Anti-Phishing Domain Matcher**: Enforces strict eTLD+1 canonical URL parsing. Matching requires both domain identity and valid Android package signatures. Autofill datasets require biometric unlock. |
| **T**ampering | Attacker tampers with the local encrypted database file on disk. | Modifying SQLite ciphertext blocks or injecting corrupt records. | **AEAD & SQLCipher Page HMACs**: SQLCipher authenticates every 4096-byte database page using HMAC-SHA512. Encrypted backups use AES-256-GCM with 128-bit authentication tags. Any byte alteration triggers immediate verification failure. |
| **R**epudiation | Malicious action performed without audit visibility. | Secret viewed, exported, or deleted without user trace. | **Tamper-Evident Audit Logging**: Every secret read, copy, export, failed unlock attempt, and master password change is logged to \`audit_log\` table with timestamp and event classification. |
| **I**nformation Disclosure | Physical loss or theft of device; extraction of storage. | Accessing device storage or pulling raw \`vaultkey.db\` over ADB. | **Zero-Knowledge Envelope Encryption**: Master password never stored. Key derived via Argon2id (64MB memory hardness). Database encrypted at rest with AES-256 DEK. Memory wiping (\`MemorySecurity.wipe\`) after every cryptographic cycle. |
| **I**nformation Disclosure | Screen recording or snooping via Recent Apps switcher. | Malicious background app recording screen or inspecting OS app switcher. | **FLAG_SECURE**: Window is flagged with \`WindowManager.LayoutParams.FLAG_SECURE\`, blocking OS screenshots, screencasting, and preview thumbnails. |
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
   - Capabilities: Presenting a fake domain like \`accounts.google.com.attacker.com\`.
   - Result: **Protected**. Domain canonicalization detects the actual eTLD+1 as \`attacker.com\` and refuses to autofill credentials for \`google.com\`.

### Out-of-Scope / Residual Risks:
- **Compromised Root / Malicious Kernel**: If the host Android kernel is rooted and compromised with a kernel-level debugger or memory-scraping rootkit, runtime physical memory can theoretically be examined while the vault is active and unlocked. VaultKey mitigates this window by auto-locking after inactivity and zeroizing keys immediately.
`;

const privacyMd = `# VaultKey Privacy Policy & Data Handling

## 1. Absolute Zero-Knowledge Guarantee
VaultKey is engineered from the ground up to guarantee absolute privacy:
- **No Account Required**: VaultKey does not require you to create an account, register an email address, or provide any personal identification.
- **Zero Telemetry & Analytics**: There are no telemetry SDKs, crash trackers, advertising identifiers, or analytics libraries included in VaultKey.
- **Zero Network Permissions**: The application does not declare the \`android.permission.INTERNET\` permission for its core engine. All data remains exclusively on your physical device.

---

## 2. Data Storage & Encryption
- All vault records (passwords, logins, secure notes, payment cards, bank accounts) are encrypted at rest using **SQLCipher AES-256**.
- The encryption keys are derived on-device from your Master Password using **Argon2id**.
- Neither the developers nor any third party possesses a master key or backdoor. If you forget your Master Password, **your data cannot be recovered**.

---

## 3. Backups & Portability
- Backups generated by VaultKey are fully encrypted client-side using **Argon2id + AES-256-GCM**.
- Backups are only saved to storage locations you explicitly choose.
- You have complete data sovereignty: export your encrypted vault at any time, or permanently purge all data using the **Crypto-Erase** function.

---

## 4. Biometric Data
- VaultKey leverages the standard Android BiometricPrompt API.
- Fingerprint and facial biometric processing is performed exclusively inside the device's hardware-isolated **Trusted Execution Environment (TEE)** or **StrongBox Keymaster**.
- Raw biometric data is never accessible to VaultKey or stored in the vault database.
`;

const architectureMd = `# VaultKey System Architecture

## 1. Architectural Overview
VaultKey employs a hybrid architecture separating a responsive, reactive presentation layer (**React Native + TypeScript**) from a secure, hardware-backed native foundation (**Android Kotlin**).

\`\`\`
+-------------------------------------------------------------------------+
|                  REACT NATIVE PRESENTATION LAYER                        |
|  - TypeScript (strict mode)      - Bilingual i18n (EN / BN)             |
|  - Zero-Knowledge Store          - Pure SVG Icons (Zero Emojis)         |
|  - Dark Obsidian UI Design       - Auto-Masking & Strength Meter        |
+-------------------------------------------------------------------------+
                                    |
                                    |  (Typed Asynchronous Bridge)
                                    v
+-------------------------------------------------------------------------+
|                       NATIVE BRIDGE MODULES                             |
|  VaultModule | BiometricModule | ClipboardModule | AutofillModule       |
|  BackupModule | SecurityModule                                          |
+-------------------------------------------------------------------------+
                                    |
                                    v
+-------------------------------------------------------------------------+
|                    KOTLIN CORE SECURITY ENGINE                          |
|  - Argon2id KDF (RFC 9106)        - AES-256-GCM AEAD Cipher             |
|  - Android Keystore & StrongBox   - MemorySecurity (Zeroization)        |
|  - VaultSessionManager (State)    - EncryptedBackupManager              |
+-------------------------------------------------------------------------+
        |                                                 |
        v                                                 v
+-------------------------------+       +---------------------------------+
|       STORAGE LAYER           |       |      ANDROID OS INTEGRATION     |
|  - SQLCipher 4.x (AES-256)    |       |  - VaultAutofillService         |
|  - Per-page HMAC-SHA512       |       |  - AutofillUnlockActivity       |
|  - Zero-Knowledge Database    |       |  - FLAG_SECURE Window           |
|  - Encrypted Backups          |       |  - Monotonic Auto-Lock Timer    |
+-------------------------------+       +---------------------------------+
\`\`\`

---

## 2. Key Modules & Separation of Concerns

### 2.1 Presentation Layer (\`src/\`)
- **\`stores/vaultStore.ts\`**: Holds non-sensitive metadata (titles, usernames, category tags, timestamps). Passwords and private notes are never stored here.
- **\`services/nativeBridge.ts\`**: Strongly typed TypeScript wrapper around native Android modules.
- **\`components/\`**: Reusable UI components including \`SecretField\`, \`StrengthMeter\`, \`VaultItemCard\`, \`CategoryFilterChips\`, and custom SVG vector icons.
- **\`i18n/\`**: Full internationalization dictionary with English (\`en\`) and Bengali (\`bn\`) language support.

### 2.2 Native Bridge Modules (\`android/app/src/main/java/com/vaultkey/modules/\`)
- **\`VaultModule.kt\`**: Handles vault initialization, master password setup, unlock, CRUD operations, and password generation.
- **\`BiometricModule.kt\`**: Coordinates AndroidX \`BiometricPrompt\` and hardware Keystore key generation.
- **\`ClipboardModule.kt\`**: Manages secure clipboard copies with an automated 30-second memory purge timer.
- **\`AutofillModule.kt\`**: Queries system autofill service status and prompts user to enable VaultKey in Android Settings.
- **\`SecurityModule.kt\`**: Provides real-time entropy calculation, strength evaluation, and password reuse analysis.
- **\`BackupModule.kt\`**: Generates and imports authenticated binary backups.

### 2.3 Core Security Engine (\`android/app/src/main/java/com/vaultkey/crypto/\`)
- **\`Argon2idKdf.kt\`**: RFC 9106 Argon2id implementation with 64MB memory, 3 iterations, and 4 threads via Bouncy Castle.
- **\`AesGcmCipher.kt\`**: 256-bit AES-GCM encryption with 96-bit random IVs and 128-bit authentication tags.
- **\`KeystoreManager.kt\`**: Hardware-backed key wrapping using Android Keystore with StrongBox support.
- **\`MemorySecurity.kt\`**: Memory zeroization utilities overwriting arrays with \`0x00\`.

### 2.4 Android Autofill Framework (\`android/app/src/main/java/com/vaultkey/autofill/\`)
- **\`VaultAutofillService.kt\`**: Standalone Android \`AutofillService\` that parses \`AssistStructure\` node hierarchies to detect username and password input fields.
- **\`DomainMatcher.kt\`**: Anti-phishing canonical URL parser with eTLD+1 matching.
- **\`AutofillUnlockActivity.kt\`**: Lightweight native dialog activity allowing biometric or master-password vault unlocking directly from third-party app autofill requests without booting React Native.
`;

const readmeMd = `# VaultKey - Professional Zero-Knowledge Android Password Manager

<p align="center">
  <img src="src/assets/vaultkey_brand_icon.jpg" width="160" height="160" alt="VaultKey Logo" style="border-radius: 32px;" />
</p>

<p align="center">
  <b>Local-First. Zero-Knowledge. Hardware-Backed Security. Built exclusively for Android.</b>
</p>

---

## Highlights & Security Features
- **Zero-Knowledge Envelope Encryption**: Master Password derives a 256-bit Key Encryption Key (KEK) using **RFC 9106 Argon2id** (64MB RAM, 3 iterations, 4 parallelism).
- **SQLCipher AES-256 Storage**: All credentials and records are stored at rest in an encrypted SQLite database with per-page HMAC-SHA512 authentication.
- **Hardware-Backed Biometrics**: Android Keystore with StrongBox Keymaster / TEE hardware integration.
- **Zero Plaintext Secrets in Memory**: Sensitive fields are zeroized using native \`MemorySecurity.wipe()\`. Decrypted passwords are never persisted in JavaScript memory, Redux, or AsyncStorage.
- **Standalone Android Autofill Service**: 100% native Kotlin \`AutofillService\` and \`AutofillUnlockActivity\` with sub-100ms response time and anti-phishing eTLD+1 domain validation.
- **Screen & Clipboard Protection**: Active \`FLAG_SECURE\` prevents screenshots and task-switcher previews; 30-second automated clipboard clearing.
- **Bilingual Internationalization**: Full native support for English and Bengali (বাংলা).
- **Zero Emojis Policy**: 100% pure SVG custom vector icons.

---

## Project Structure
\`\`\`
d:\\app\\PROFESSIONAL PASSWORD MANAGER\\
├── android/
│   ├── app/src/main/
│   │   ├── java/com/vaultkey/
│   │   │   ├── autofill/          # VaultAutofillService, DomainMatcher, AutofillUnlockActivity
│   │   │   ├── backup/            # EncryptedBackupManager (VAULTKEY container)
│   │   │   ├── crypto/            # Argon2idKdf, AesGcmCipher, KeystoreManager, MemorySecurity
│   │   │   ├── database/          # VaultDatabaseHelper (SQLCipher), VaultDao, Models
│   │   │   ├── modules/           # React Native bridge modules
│   │   │   └── session/           # VaultSessionManager (Envelope encryption state machine)
│   │   ├── res/                   # Drawables, mipmaps with custom VaultKey brand icons
│   │   └── AndroidManifest.xml    # Autofill service & FLAG_SECURE registration
├── src/
│   ├── assets/                    # High-resolution brand logo & vector assets
│   ├── components/                # Reusable UI components & pure SVG icons
│   ├── i18n/                      # English & Bengali translations
│   ├── screens/                   # Vault, Auth, Generator, Security, Backup, Settings
│   ├── services/                  # Strongly typed native bridge wrappers
│   ├── stores/                    # Zero-knowledge React Native state store
│   ├── theme/                     # Dark obsidian palette (#0B0F17) & emerald accents (#10B981)
│   └── types/                     # Strict TypeScript interfaces
├── ARCHITECTURE.md                # System architecture documentation
├── SECURITY.md                    # Cryptographic specification & memory hygiene
├── THREAT_MODEL.md                # STRIDE threat model & risk analysis
└── PRIVACY.md                     # Zero-knowledge privacy declaration
\`\`\`

---

## Verification & Compilation

### 1. TypeScript Verification
To verify that all TypeScript code conforms strictly with \`strict: true\`:
\`\`\`bash
npx tsc --noEmit
\`\`\`

### 2. Android Native Build
To compile all Kotlin, Java, and C++ native security layers:
\`\`\`bash
cd android
.\\gradlew.bat compileDebugSources
\`\`\`

### 3. Assembling the Debug APK
\`\`\`bash
cd android
.\\gradlew.bat assembleDebug
\`\`\`
`;

fs.writeFileSync(path.join(root, 'SECURITY.md'), securityMd, 'utf8');
fs.writeFileSync(path.join(root, 'THREAT_MODEL.md'), threatModelMd, 'utf8');
fs.writeFileSync(path.join(root, 'PRIVACY.md'), privacyMd, 'utf8');
fs.writeFileSync(path.join(root, 'ARCHITECTURE.md'), architectureMd, 'utf8');
fs.writeFileSync(path.join(root, 'README.md'), readmeMd, 'utf8');

console.log('All 5 documentation files successfully written!');
