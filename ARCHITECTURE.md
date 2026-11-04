# VaultKey System Architecture

## 1. Architectural Overview
VaultKey employs a hybrid architecture separating a responsive, reactive presentation layer (**React Native + TypeScript**) from a secure, hardware-backed native foundation (**Android Kotlin**).

```
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
```

---

## 2. Key Modules & Separation of Concerns

### 2.1 Presentation Layer (`src/`)
- **`stores/vaultStore.ts`**: Holds non-sensitive metadata (titles, usernames, category tags, timestamps). Passwords and private notes are never stored here.
- **`services/nativeBridge.ts`**: Strongly typed TypeScript wrapper around native Android modules.
- **`components/`**: Reusable UI components including `SecretField`, `StrengthMeter`, `VaultItemCard`, `CategoryFilterChips`, and custom SVG vector icons.
- **`i18n/`**: Full internationalization dictionary with English (`en`) and Bengali (`bn`) language support.

### 2.2 Native Bridge Modules (`android/app/src/main/java/com/vaultkey/modules/`)
- **`VaultModule.kt`**: Handles vault initialization, master password setup, unlock, CRUD operations, and password generation.
- **`BiometricModule.kt`**: Coordinates AndroidX `BiometricPrompt` and hardware Keystore key generation.
- **`ClipboardModule.kt`**: Manages secure clipboard copies with an automated 30-second memory purge timer.
- **`AutofillModule.kt`**: Queries system autofill service status and prompts user to enable VaultKey in Android Settings.
- **`SecurityModule.kt`**: Provides real-time entropy calculation, strength evaluation, and password reuse analysis.
- **`BackupModule.kt`**: Generates and imports authenticated binary backups.

### 2.3 Core Security Engine (`android/app/src/main/java/com/vaultkey/crypto/`)
- **`Argon2idKdf.kt`**: RFC 9106 Argon2id implementation with 64MB memory, 3 iterations, and 4 threads via Bouncy Castle.
- **`AesGcmCipher.kt`**: 256-bit AES-GCM encryption with 96-bit random IVs and 128-bit authentication tags.
- **`KeystoreManager.kt`**: Hardware-backed key wrapping using Android Keystore with StrongBox support.
- **`MemorySecurity.kt`**: Memory zeroization utilities overwriting arrays with `0x00`.

### 2.4 Android Autofill Framework (`android/app/src/main/java/com/vaultkey/autofill/`)
- **`VaultAutofillService.kt`**: Standalone Android `AutofillService` that parses `AssistStructure` node hierarchies to detect username and password input fields.
- **`DomainMatcher.kt`**: Anti-phishing canonical URL parser with eTLD+1 matching.
- **`AutofillUnlockActivity.kt`**: Lightweight native dialog activity allowing biometric or master-password vault unlocking directly from third-party app autofill requests without booting React Native.
