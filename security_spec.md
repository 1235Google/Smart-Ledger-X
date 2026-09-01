# Security Specification: Smart Ledger Firebase Architecture

## 1. Data Invariants & Zero-Trust Policies
- **Strict User Partitioning**: Every resource under `/users/{userId}/**` is accessible only by the authenticated owner where `request.auth.uid == userId`.
- **Identity Spoofing Prevention**: A user authenticated as `uid_A` cannot read, write, update, or delete any data under `/users/uid_B`.
- **State Integrity**: All ledger entries, profile documents, devices, and application configurations are strictly bounded to the creator's namespace.
- **Default Deny**: Any path outside explicitly permitted namespaces is strictly denied (`match /{document=**} { allow read, write: if false; }`).
- **Path Hardening**: Path IDs must pass alphanumeric validation (`isValidId`) to prevent Denial of Wallet resource attacks.
- **Volumetric Boundaries**: String fields are constrained with `.size()` limits and numeric values are verified for type safety.
- **Admin Privilege Lockdown**: Admin endpoints require verified authentication and existing role records in `/adminUsers`.

## 2. The Dirty Dozen Payloads (Targeting Exploits)
1. **Unauthenticated Read on User Profile**: `GET /users/user_123/profile/info` with `auth: null` -> **PERMISSION_DENIED**
2. **Cross-Tenant Ledger Write**: `SET /users/victim_user/ledger/tx_999` with `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
3. **Cross-Tenant Ledger Query/List**: `LIST /users/victim_user/ledger` with `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
4. **Root Database Blanket Read**: `LIST /{document=**}` with `auth.uid == 'user_123'` -> **PERMISSION_DENIED**
5. **Cross-Tenant State Modification**: `SET /users/victim_user/app/state` with `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
6. **Cross-Tenant Customer Modification**: `DELETE /users/victim_user/transactions/cust_tx_1` with `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
7. **Cross-Tenant Bill Modification**: `DELETE /users/victim_user/bills/bill_99` with `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
8. **Spoofed Notification Update**: `UPDATE /notifications/notif_1` with `resource.data.userId == 'victim_user'` and `auth.uid == 'attacker_user'` -> **PERMISSION_DENIED**
9. **Unauthenticated Transaction Insert**: `CREATE /users/user_123/ledger/tx_1` with `auth: null` -> **PERMISSION_DENIED**
10. **Malicious Path Traversal Attempt**: `GET /users/user_123/../../adminSecurityLogs/log_1` by non-admin -> **PERMISSION_DENIED**
11. **Cross-User Batch Write Attempt**: `BATCH SET [/users/user_A/ledger/1, /users/user_B/ledger/2]` by `user_A` -> **PERMISSION_DENIED**
12. **Unauthenticated State Overwrite**: `SET /users/user_123/app/state` with `auth: null` -> **PERMISSION_DENIED**

## 3. The Eight Pillars Validation Mapping
1. **Master Gate**: All user data paths are rooted strictly in `users/{userId}` where `isOwner(userId)` is enforced.
2. **Validation Blueprints**: Dedicated `isValid[Entity]` helpers validate types, boundaries, and required fields.
3. **Path Variable Hardening**: `isValidId()` validates doc IDs for single-doc operations to prevent ID poisoning.
4. **Tiered Identity Logic**: Admin roles and Owner status are validated via server-side database lookups in `/adminUsers`.
5. **Array & Field Bounds**: Payload string lengths (names, notes, hashes) and list sizes are strictly capped.
6. **PII Isolation**: Profile PII (email, phone, address) is restricted to the document owner.
7. **Default Deny Fallback**: Global `{document=**}` deny block prevents access to unmapped collections.
8. **Secure List Queries**: `allow list` explicitly validates `isOwner(userId)` or `resource.data.userId == request.auth.uid`.

