import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, sql } from "drizzle-orm";
import { db } from "../_lib/db";
import { bankingAccounts, bankingTransactions } from "../_lib/schema";
import { apiHandler } from "../_lib/handler";

export default apiHandler({
  POST: async (req: VercelRequest, res: VercelResponse) => {
    const { username, amount } = req.body;

    if (!username || typeof amount !== "number" || amount <= 0) {
      res.status(400).json({ detail: "Valid username and positive amount are required" });
      return;
    }

    const existing = await db
      .select()
      .from(bankingAccounts)
      .where(eq(bankingAccounts.username, username))
      .limit(1);

    if (existing.length === 0) {
      res.status(404).json({ detail: `Account not found for username: ${username}` });
      return;
    }

    const account = existing[0];
    if (account.balance < amount) {
      res.status(400).json({
        detail: `Insufficient funds. Current balance: $${account.balance.toFixed(2)}`,
      });
      return;
    }

    const updated = await db
      .update(bankingAccounts)
      .set({ balance: sql`${bankingAccounts.balance} - ${amount}` })
      .where(eq(bankingAccounts.username, username))
      .returning();

    await db.insert(bankingTransactions).values({
      username,
      transactionType: "Withdraw",
      amount,
    });

    res.json({
      message: `Withdrew $${amount.toFixed(2)} from ${username}.`,
      username,
      newBalance: updated[0].balance,
    });
  },
});
