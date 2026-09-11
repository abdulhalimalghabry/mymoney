# Security Specification: My Finance Manager

## 1. Data Invariants
1. **User Identity Isolation**: Every document in `/users/{userId}/...` must be strictly owned by `request.auth.uid == userId`. Cross-user reads or writes are unconditionally denied.
2. **Account Integrity**: An account must have a valid name, currency in `[AED, ETB, KES, USD]`, account type in `[cash, bank, savings, investment, ewallet, other]`, and numeric `currentBalance`.
3. **Transaction Immutability & Validity**: Transactions require positive amount, valid currency, valid date string, account ID, and non-empty type.
4. **Budget Bounds**: Budgets must have numeric amount >= 0, valid category, and month string format `YYYY-MM`.
5. **Savings Milestones**: Target amount must be > 0, current amount >= 0, status in `[active, completed, paused]`.
6. **Investment Records**: Invested amount >= 0, current value >= 0.
7. **Debt Invariant**: Paid amount <= total amount, remainingAmount == totalAmount - paidAmount, status in `[pending, partially_paid, paid, overdue]`.
8. **Anti-Update Gap & Anti-Spoofing**: Incoming `userId` field must always match `request.auth.uid`.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Read**: Attempting to read `/users/{victimId}/accounts` without auth token. -> PERMISSION_DENIED
2. **Cross-Tenant Account Hijacking**: User B attempting to create an account in `/users/{userA}/accounts/acc1`. -> PERMISSION_DENIED
3. **Owner Field Impersonation**: User A creating a transaction with `userId: "userB"`. -> PERMISSION_DENIED
4. **Arbitrary Key Injection (Shadow Field)**: Updating account with injected `{ isAdmin: true, bypassLimit: true }`. -> PERMISSION_DENIED
5. **Negative Balance Overflow / Denial of Wallet**: Injected string of 1MB in account name. -> PERMISSION_DENIED
6. **Invalid Currency Code Injection**: Adding transaction with `currency: "BITCOIN_EXPLOIT"`. -> PERMISSION_DENIED
7. **Negative Transaction Amount**: Creating transaction with `amount: -5000`. -> PERMISSION_DENIED
8. **Malicious Document ID Path Poisoning**: Querying document with illegal ID `../../admins/super`. -> PERMISSION_DENIED
9. **Fake Email Admin Escalation**: Sending unverified email token with admin claim. -> PERMISSION_DENIED
10. **Debt State Tampering**: Updating debt to `paid` without updating `paidAmount`. -> PERMISSION_DENIED
11. **Settings Hijack**: User A attempting to modify User B's exchange rates in `/users/{userB}/settings/general`. -> PERMISSION_DENIED
12. **Blanket Query Scraping**: Attempting to list all users' financial records without user boundary. -> PERMISSION_DENIED
