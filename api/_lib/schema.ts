import {
  doublePrecision,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const bankingAccounts = pgTable("banking_accounts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  balance: doublePrecision("balance").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`NOW()`),
});

export const bankingTransactions = pgTable("banking_transactions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull(),
  transactionType: text("transaction_type").notNull(),
  amount: doublePrecision("amount").notNull(),
  transactionDatetime: timestamp("transaction_datetime", {
    withTimezone: true,
  })
    .notNull()
    .default(sql`NOW()`),
});
