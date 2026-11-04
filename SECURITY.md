# VaultKey Security Specification & Cryptographic Architecture

## 1. Executive Summary & Security Philosophy
VaultKey is an offline-first, zero-knowledge password and identity management system engineered exclusively for Android.
The foundational security invariant of VaultKey is:
> **Decryption secrets and master credentials must NEVER exist in unencrypted storage, network traffic, persistent JavaScript memory, application logs, or crash analytics.**

VaultKey enforces an envelope encryption model with hardware-backed biometric authentication, SQLCipher 256-bit database encryption, and memory-safe zeroization of all intermediate keys.

---

## 2. Cryptographic Specifications

### 2.1 Key Derivation Function (KDF): Argon2id
To defend against GPU/FPGA/ASIC brute-force attacks, VaultKey derives key encryption keys using RFC 9106 Argon2id implemented via Bouncy Castle (`org.bouncycastle.crypto.generators.Argon2BytesGenerator`).

| Parameter | Value | Rationale |
| :--- | :--- | :--- |
| **Algorithm** | Argon2id | Hybrid mode resistant to both side-channel and GPU attacks |
| **Iterations (`t`)** | 3 | Meets OWASP and NIST recommendations for mobile CPU limits |
| **Memory (`m`)** | 64 MB (`65,536 KB`) | High memory hardness defeating ASIC mass-parallelism |
| **Parallelism (`p`)** | 4 | Optimally matches modern multi-core mobile architectures |
| **Salt Size** | 32 bytes (256 bits) | Cryptographically secure random (`SecureRandom`) |
| **Output Key Length** | 32 bytes (256 bits) | Direct fit for AES-256-GCM |

### 2.2 Envelope Encryption & Key Hierarchy

```
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
```

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
   - A random biometric DEK token is encrypted using an Android Keystore key with `setUserAuthenticationRequired(true)`.
   - StrongBox Keymaster is queried; if available, keys are bound to hardware security modules (HSM/SE).

### 2.3 Authenticated Symmetric Encryption: AES-256-GCM
All field-level secret encryption and encrypted backups utilize AES-256-GCM:
- **Cipher**: `AES/GCM/NoPadding`
- **Key Length**: 256 bits
- **IV / Nonce**: 96 bits (12 bytes), generated freshly for every encryption operation via `SecureRandom`
- **Tag Length**: 128 bits (16 bytes)
- **Container Format**: `[ 12-byte IV ] || [ Ciphertext ] || [ 16-byte Auth Tag ]`

---

## 3. Database Security (SQLCipher 4.x)
- **Engine**: SQLCipher Android Community Edition (`net.zetetic:sqlcipher-android:4.6.1`).
- **Algorithm**: AES-256 in CBC mode with per-page HMAC-SHA512 authentication.
- **Page Size**: 4096 bytes.
- **KDF Iterations**: 256,000 PBKDF2 iterations for page keys.
- **Zero-knowledge**: Without the DEK in memory, the SQLite file appears as high-entropy pseudorandom noise.

---

## 4. Memory Hygiene & Zeroization
Because the Android runtime utilizes garbage collection, strings can remain in heap memory for unpredictable durations. VaultKey applies strict memory defense:
- **CharArray & ByteArray**: All sensitive credentials in Kotlin are received as `CharArray` or `ByteArray`.
- **Zeroization**: `MemorySecurity.wipe(ByteArray)` and `MemorySecurity.wipe(CharArray)` overwrite arrays with zeroes (`0x00`) immediately after cryptographic derivation.
- **Native Bridge Isolation**: Secret fields (passwords, PINs, notes) are only decrypted on-demand when explicitly inspected by the user. Item lists and summaries sent over the React Native bridge only contain non-sensitive metadata (title, username, category, URLs, timestamps).
- **Auto-Lock Monotonic Timer**: A monotonic clock (`SystemClock.elapsedRealtime()`) tracks inactivity. The timer cannot be deceived by manipulating the device clock.

---

## 5. Screen Security & OS Protection
- **FLAG_SECURE**: Enabled across the application and during Autofill interaction.
  - Prevents screenshots and screen recording.
  - Prevents sensitive vault credentials from appearing in the Android Recent Apps thumbnail switcher.
- **Clipboard Auto-Clear**:
  - The native `ClipboardModule` uses a countdown timer (default: 30 seconds) to purge copied passwords from the Android system clipboard.
  - Clipboard text is cleared and verified.

---

## 6. Android Autofill Framework Security
VaultKey provides a dedicated native Android `AutofillService`:
1. **Zero-JavaScript Runtime**: `VaultAutofillService` operates entirely within native Kotlin without booting the React Native JavaScript engine, ensuring instant sub-100ms response and minimal memory footprint.
2. **Canonical Domain Matching (Anti-Phishing)**:
   - Web domains and Android package signatures are strictly validated.
   - Uses Public Suffix List (eTLD+1) logic to prevent subdomain spoofing (e.g. `paypal.com.evil.com` is never matched to `paypal.com`).
3. **Biometric Gate**: Autofill datasets require biometric or master-password authorization before releasing credentials to the requesting app.

---

## 7. Encrypted Backup Container Specification
VaultKey backups use an authenticated, portable binary container format:

| Offset | Field | Size | Description |
| :--- | :--- | :--- | :--- |
| `0x00 - 0x07` | Magic Header | 8 bytes | ASCII `"VAULTKEY"` |
| `0x08 - 0x09` | Version | 2 bytes | Short integer (e.g. `0x0001`) |
| `0x0A - 0x29` | Salt | 32 bytes | Random Argon2id salt |
| `0x2A - 0x35` | IV | 12 bytes | AES-GCM 96-bit nonce |
| `0x36 - EOF` | Ciphertext + Tag | Variable | AES-256-GCM encrypted JSON payload |

Backups can be restored with Merge or Replace options with pre-restore checksum and credential count validation.

---

## 8. Security Policy & Vulnerability Reporting

### Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

### Reporting a Vulnerability

Security is paramount to VaultKey. If you discover a security vulnerability or cryptographic weakness, we appreciate your help in disclosing it responsibly.

1. **Do NOT open a public GitHub issue.**
2. Report the vulnerability privately via **GitHub Security Advisories** by navigating to the **Security** tab of this repository and selecting **"Report a vulnerability"**.
3. Alternatively, send an encrypted or direct email to the project maintainers with the details.
4. Please include:
   - Detailed description of the potential vulnerability
   - Step-by-step reproduction instructions or proof-of-concept
   - Potential impact and affected platforms (Android, Windows, Extension)
5. We commit to acknowledging receipt within 48 hours and providing regular updates until a patch is deployed.

