import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "../_lib/db";
import { bankingTransactions } from "../_lib/schema";
import { apiHandler } from "../_lib/handler";

export default apiHandler({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    const username = req.query.username as string;
    const typeFilter = req.query.type as string | undefined;
    const sortOrder = req.query.sort as string | undefined;

    if (!username) {
      res.status(400).json({ detail: "username is required" });
      return;
    }

    let query = db
      .select()
      .from(bankingTransactions)
      .where(eq(bankingTransactions.username, username))
      .$dynamic();

    if (typeFilter) {
      query = query.where(eq(bankingTransactions.transactionType, typeFilter));
    }

    const orderFn = sortOrder === "asc" ? asc : desc;
    const rows = await query.orderBy(
      orderFn(bankingTransactions.transactionDatetime),
    );

    res.json({ username, transactions: rows });
  },
});
