import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "../../_lib/db.js";
import { bankingAccounts } from "../../_lib/schema.js";
import { apiHandler } from "../../_lib/handler.js";

export default apiHandler({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    const username = req.query.username as string;
    if (!username) {
      res.status(400).json({ detail: "username is required" });
      return;
    }

    const account = await db
      .select()
      .from(bankingAccounts)
      .where(eq(bankingAccounts.username, username))
      .limit(1);

    if (account.length === 0) {
      res
        .status(404)
        .json({ detail: `Account not found for username: ${username}` });
      return;
    }

    res.json({ username: account[0].username, balance: account[0].balance });
  },
});
