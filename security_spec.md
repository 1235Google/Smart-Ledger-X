# Security Specification: Smart Ledger Firebase Architecture

## 1. Data Invariants & Zero-Trust Policies
- **Strict User Partitioning**: Every resource under `/users/{userId}/**` is accessible only by the authenticated owner where `request.auth.uid == userId`.
- **Identity Spoofing Prevention**: A user authenticated as `uid_A` cannot read, write, update, or delete any data under `/users/uid_B`.
- **State Integrity**: All ledger entries, profile documents, and application configurations are strictly bounded to the creator's namespace.
- **Default Deny**: Any path outside explicitly permitted namespaces is strictly denied (`match /{document=**} { allow read, write: if false; }`).

## 2. The Dirty Dozen Payloads (Targeting Exploits)
1. **Unauthenticated Read on User Profile**: `GET /users/user_123/profile` with `auth: null` -> **DENIED**
2. **Cross-Tenant Ledger Write**: `SET /users/victim_user/ledger/tx_999` with `auth.uid == 'attacker_user'` -> **DENIED**
3. **Cross-Tenant Ledger Query/List**: `LIST /users/victim_user/ledger` with `auth.uid == 'attacker_user'` -> **DENIED**
4. **Root Database Blanket Read**: `LIST /{document=**}` with `auth.uid == 'user_123'` -> **DENIED**
5. **Cross-Tenant State Modification**: `SET /users/victim_user/app/state` with `auth.uid == 'attacker_user'` -> **DENIED**
6. **Cross-Tenant Customer Modification**: `DELETE /users/victim_user/customers/cust_1` with `auth.uid == 'attacker_user'` -> **DENIED**
7. **Cross-Tenant Gullak Savings Access**: `GET /users/victim_user/gullak/entry_1` with `auth.uid == 'attacker_user'` -> **DENIED**
8. **Spoofed Notification Update**: `UPDATE /notifications/notif_1` with `resource.data.userId == 'victim_user'` and `auth.uid == 'attacker_user'` -> **DENIED**
9. **Unauthenticated Transaction Insert**: `CREATE /users/user_123/ledger/tx_1` with `auth: null` -> **DENIED**
10. **Malicious Path Traversal Attempt**: `GET /users/user_123/../../admins/flag` -> **DENIED**
11. **Cross-User Batch Write Attempt**: `BATCH SET [/users/user_A/ledger/1, /users/user_B/ledger/2]` by `user_A` -> **DENIED**
12. **Unauthenticated State Overwrite**: `SET /users/user_123/app/state` with `auth: null` -> **DENIED**
