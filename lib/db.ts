
import "server-only";

import { mkdir } from "node:fs/promises";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

const defaultDbPath = path.join(
  process.cwd(),
  "data",
  "finatic.sqlite"
);

const databasePath = path.resolve(
  process.env.DATABASE_PATH || defaultDbPath
);

type FinaticDb = Database<
  sqlite3.Database,
  sqlite3.Statement
>;

async function openDb(): Promise<FinaticDb> {
  await mkdir(path.dirname(databasePath), {
    recursive: true,
  });

  const db = await open({
    filename: databasePath,
    driver: sqlite3.Database,
  });

  try {
    await db.exec("PRAGMA foreign_keys = ON;");
    await db.exec("PRAGMA busy_timeout = 5000;");
    await db.exec("PRAGMA journal_mode = WAL;");

    await db.exec(`
      CREATE TABLE IF NOT EXISTS Users (
        UserID INTEGER PRIMARY KEY AUTOINCREMENT,
        Username TEXT NOT NULL UNIQUE,
        Email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        PasswordHash TEXT NOT NULL,
        CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS Profiles (
        ProfileID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL UNIQUE,
        FirstName TEXT,
        LastName TEXT,
        PhoneNumber TEXT,
        Currency TEXT DEFAULT 'USD',
        FOREIGN KEY (UserID)
          REFERENCES Users(UserID)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS BankAccounts (
        AccountID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        BankName TEXT NOT NULL,
        AccountType TEXT NOT NULL,
        AccountLast4 TEXT,
        BalanceCents INTEGER NOT NULL DEFAULT 0,
        CreatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserID)
          REFERENCES Users(UserID)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS PlaidItems (
        ItemID INTEGER PRIMARY KEY AUTOINCREMENT,
        UserID INTEGER NOT NULL,
        PlaidItemID TEXT NOT NULL UNIQUE,
        InstitutionID TEXT,
        InstitutionName TEXT,
        AccessTokenEncrypted TEXT NOT NULL,
        TransactionsCursor TEXT,
        Status TEXT NOT NULL DEFAULT 'active'
          CHECK (
            Status IN (
              'active',
              'requires_update',
              'disconnected'
            )
          ),
        CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (UserID)
          REFERENCES Users(UserID)
          ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_bankaccounts_user_account
        ON BankAccounts (UserID, AccountID);

      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_plaiditems_user_item
        ON PlaidItems (UserID, ItemID);

      CREATE TABLE IF NOT EXISTS PlaidAccountLinks (
        AccountID INTEGER PRIMARY KEY,
        UserID INTEGER NOT NULL,
        ItemID INTEGER NOT NULL,
        PlaidAccountID TEXT NOT NULL,
        AccountName TEXT NOT NULL,
        OfficialName TEXT,
        AccountSubtype TEXT,
        CurrentBalanceCents INTEGER,
        AvailableBalanceCents INTEGER,
        CreditLimitCents INTEGER,
        CurrencyCode TEXT,
        UnofficialCurrencyCode TEXT,
        BalanceLastUpdatedAt TEXT,
        UNIQUE (ItemID, PlaidAccountID),
        FOREIGN KEY (UserID, AccountID)
          REFERENCES BankAccounts (UserID, AccountID)
          ON DELETE CASCADE,
        FOREIGN KEY (UserID, ItemID)
          REFERENCES PlaidItems (UserID, ItemID)
          ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS PlaidTransactions (
        TransactionID INTEGER PRIMARY KEY AUTOINCREMENT,
        ItemID INTEGER NOT NULL,
        UserID INTEGER NOT NULL,
        PlaidTransactionID TEXT NOT NULL,
        PlaidAccountID TEXT NOT NULL,
        Name TEXT NOT NULL,
        MerchantName TEXT,
        Amount REAL NOT NULL,
        CurrencyCode TEXT,
        TransactionDate TEXT NOT NULL,
        Pending INTEGER NOT NULL DEFAULT 0,
        CategoryPrimary TEXT,
        CategoryDetailed TEXT,
        CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (ItemID, PlaidTransactionID),
        FOREIGN KEY (UserID, ItemID)
          REFERENCES PlaidItems (UserID, ItemID)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS
        idx_bankaccounts_user
        ON BankAccounts (UserID);

      CREATE INDEX IF NOT EXISTS
        idx_plaiditems_user
        ON PlaidItems (UserID);

      CREATE INDEX IF NOT EXISTS
        idx_plaidaccountlinks_item
        ON PlaidAccountLinks (ItemID);

      CREATE INDEX IF NOT EXISTS
        idx_plaidaccountlinks_user
        ON PlaidAccountLinks (UserID);

      CREATE INDEX IF NOT EXISTS
        idx_plaidtransactions_user_date
        ON PlaidTransactions (
          UserID,
          TransactionDate DESC
        );

      CREATE INDEX IF NOT EXISTS
        idx_plaidtransactions_item
        ON PlaidTransactions (ItemID);

      CREATE INDEX IF NOT EXISTS
        idx_plaidtransactions_account
        ON PlaidTransactions (PlaidAccountID);
    `);

    const accountColumns = await db.all<
      { name: string }[]
    >("PRAGMA table_info(PlaidAccountLinks)");

    const existingColumns = new Set(
      accountColumns.map((column) => column.name)
    );

    if (!existingColumns.has("CurrentBalanceCents")) {
      await db.exec(`
        ALTER TABLE PlaidAccountLinks
        ADD COLUMN CurrentBalanceCents INTEGER;
      `);
    }

    if (!existingColumns.has("AvailableBalanceCents")) {
      await db.exec(`
        ALTER TABLE PlaidAccountLinks
        ADD COLUMN AvailableBalanceCents INTEGER;
      `);
    }

    if (!existingColumns.has("CreditLimitCents")) {
      await db.exec(`
        ALTER TABLE PlaidAccountLinks
        ADD COLUMN CreditLimitCents INTEGER;
      `);
    }

    if (!existingColumns.has("BalanceLastUpdatedAt")) {
      await db.exec(`
        ALTER TABLE PlaidAccountLinks
        ADD COLUMN BalanceLastUpdatedAt TEXT;
      `);
    }

    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function withDb<T>(
  callback: (db: FinaticDb) => Promise<T>
): Promise<T> {
  const db = await openDb();

  try {
    return await callback(db);
  } finally {
    await db.close();
  }
}

export async function withTransaction<T>(
  callback: (db: FinaticDb) => Promise<T>
): Promise<T> {
  return withDb(async (db) => {
    await db.exec("BEGIN IMMEDIATE;");

    try {
      const result = await callback(db);

      await db.exec("COMMIT;");

      return result;
    } catch (error) {
      await db.exec("ROLLBACK;");
      throw error;
    }
  });
}
