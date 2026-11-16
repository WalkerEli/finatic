-- PRAGMA foreign_keys = ON;

-- BEGIN TRANSACTION;

-- CREATE TABLE IF NOT EXISTS Users (
--     UserID INTEGER PRIMARY KEY AUTOINCREMENT,
--     Username TEXT NOT NULL UNIQUE,
--     Email TEXT NOT NULL UNIQUE,
--     PasswordHash TEXT NOT NULL,
--     CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE TABLE IF NOT EXISTS Profiles (
--     ProfileID INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserID INTEGER NOT NULL UNIQUE,
--     FirstName TEXT,
--     LastName TEXT,
--     PhoneNumber TEXT,
--     Currency TEXT DEFAULT 'USD',
--     FOREIGN KEY (UserID) REFERENCES Users(UserID)
-- );

-- CREATE TABLE IF NOT EXISTS BankAccounts (
--     AccountID INTEGER PRIMARY KEY AUTOINCREMENT,
--     UserID INTEGER NOT NULL,
--     BankName TEXT NOT NULL,
--     AccountType TEXT NOT NULL,
--     AccountLast4 TEXT,
--     BalanceCents INTEGER NOT NULL DEFAULT 0,
--     CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (UserID) REFERENCES Users(UserID)
-- );

-- COMMIT;


-- Finatic database schema (SQLite)
-- Safe to run against the uploaded database and databases that already have
-- the original Users / Profiles / BankAccounts tables.
-- Existing tables and rows are not dropped or overwritten.

-- SQLite requires this on EACH database connection, not just when the
-- schema is initialized. We will enable it in lib/db.ts as well.
PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- 1. Application users. Keep names/columns compatible with auth routes.
CREATE TABLE IF NOT EXISTS Users (
    UserID INTEGER PRIMARY KEY AUTOINCREMENT,
    Username TEXT NOT NULL UNIQUE,
    Email TEXT NOT NULL UNIQUE,
    PasswordHash TEXT NOT NULL,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. One optional profile for each user.
CREATE TABLE IF NOT EXISTS Profiles (
    ProfileID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER NOT NULL UNIQUE,
    FirstName TEXT,
    LastName TEXT,
    PhoneNumber TEXT,
    Currency TEXT DEFAULT 'USD',
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- 3. Preserve the original local BankAccounts structure unchanged.
-- Plaid-specific identifiers and nullable balance details go in
-- PlaidAccountLinks below so existing account rows remain valid.
CREATE TABLE IF NOT EXISTS BankAccounts (
    AccountID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER NOT NULL,
    BankName TEXT NOT NULL,
    AccountType TEXT NOT NULL,
    AccountLast4 TEXT,
    BalanceCents INTEGER NOT NULL DEFAULT 0,
    CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);

-- 4. One Plaid Item represents one bank connection and may contain
-- multiple bank accounts. Do NOT store plaintext access tokens here.
CREATE TABLE IF NOT EXISTS PlaidItems (
    ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
    UserID INTEGER NOT NULL,
    PlaidItemID TEXT NOT NULL UNIQUE,
    InstitutionID TEXT,
    InstitutionName TEXT,
    AccessTokenEncrypted TEXT NOT NULL,
    TransactionsCursor TEXT,
    Status TEXT NOT NULL DEFAULT 'active'
        CHECK (Status IN ('active', 'requires_update', 'disconnected')),
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

-- Ownership-aware composite keys let SQLite enforce that an account and
-- its Plaid Item belong to the same user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_bankaccounts_user_account
    ON BankAccounts (UserID, AccountID);
CREATE UNIQUE INDEX IF NOT EXISTS idx_plaiditems_user_item
    ON PlaidItems (UserID, ItemID);

-- 5. Link an existing local bank account to one Plaid bank connection.
-- Each local AccountID can have at most one Plaid mapping.
CREATE TABLE IF NOT EXISTS PlaidAccountLinks (
    AccountID INTEGER PRIMARY KEY,
    UserID INTEGER NOT NULL,
    ItemID INTEGER NOT NULL,
    PlaidAccountID TEXT NOT NULL,
    AccountName TEXT NOT NULL,
    OfficialName TEXT,
    AccountSubtype TEXT,
    AvailableBalanceCents INTEGER,
    CreditLimitCents INTEGER,
    CurrencyCode TEXT,
    UnofficialCurrencyCode TEXT,
    BalanceLastUpdatedAt TEXT,
    UNIQUE (ItemID, PlaidAccountID),
    FOREIGN KEY (UserID, AccountID)
        REFERENCES BankAccounts (UserID, AccountID) ON DELETE CASCADE,
    FOREIGN KEY (UserID, ItemID)
        REFERENCES PlaidItems (UserID, ItemID) ON DELETE CASCADE
);

-- 6. Individual Plaid transactions, not recurring-stream summaries.
-- Plaid convention: positive amounts mean money OUT, negative mean IN.
-- Store currency amounts in integer minor units (cents for USD).
CREATE TABLE IF NOT EXISTS Transactions (
    TransactionID INTEGER PRIMARY KEY AUTOINCREMENT,
    AccountID INTEGER NOT NULL,
    PlaidTransactionID TEXT NOT NULL,
    Name TEXT NOT NULL,
    MerchantName TEXT,
    AmountCents INTEGER NOT NULL,
    TransactionDate TEXT NOT NULL,          -- YYYY-MM-DD
    AuthorizedDate TEXT,                    -- YYYY-MM-DD, if available
    Pending INTEGER NOT NULL DEFAULT 0 CHECK (Pending IN (0, 1)),
    PendingTransactionID TEXT,
    PrimaryCategory TEXT,
    DetailedCategory TEXT,
    CurrencyCode TEXT,
    UnofficialCurrencyCode TEXT,
    PaymentChannel TEXT,
    CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (AccountID, PlaidTransactionID),
    FOREIGN KEY (AccountID)
        REFERENCES PlaidAccountLinks (AccountID) ON DELETE CASCADE
);

-- 7. Indexes for typical dashboard and transaction history queries.
CREATE INDEX IF NOT EXISTS idx_bankaccounts_user
    ON BankAccounts (UserID);
CREATE INDEX IF NOT EXISTS idx_plaiditems_user
    ON PlaidItems (UserID);
CREATE INDEX IF NOT EXISTS idx_plaidaccountlinks_item
    ON PlaidAccountLinks (ItemID);
CREATE INDEX IF NOT EXISTS idx_transactions_account_date
    ON Transactions (AccountID, TransactionDate DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_date
    ON Transactions (TransactionDate DESC);

COMMIT;
