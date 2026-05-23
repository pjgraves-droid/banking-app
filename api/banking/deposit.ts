import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, sql } from "drizzle-orm";
import { db } from "../_lib/db.js";
import { bankingAccounts, bankingTransactions } from "../_lib/schema.js";
import { apiHandler } from "../_lib/handler.js";

export default apiHandler({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ detail: "Valid username and positive amount are required" });
      return;
    }

    // Upsert account
    const existing = await db
      .select()
      .from(bankingAccounts)
      .where(eq(bankingAccounts.username, username))
      .limit(1);

    let newBalance: number;

    if (existing.length === 0) {
      const inserted = await db
        .insert(bankingAccounts)
        .values({ username, balance: amount })
        .returning();
      newBalance = inserted[0].balance;
    } else {
      const updated = await db
        .update(bankingAccounts)
        .set({ balance: sql`${bankingAccounts.balance} + ${amount}` })
        .where(eq(bankingAccounts.username, username))
        .returning();
      newBalance = updated[0].balance;
    }

    await db.insert(bankingTransactions).values({
      username,
      transactionType: "Deposit",
      amount,
    });

    res.json({
      message: `Deposited $${amount.toFixed(2)} to ${username}.`,
      username,
      newBalance,
    });
  },
});
