import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, desc } from "drizzle-orm";
import { db } from "../_lib/db.js";
import { bankingTransactions } from "../_lib/schema.js";
import { apiHandler } from "../_lib/handler.js";

export default apiHandler({
  GET: async (req: VercelRequest, res: VercelResponse) => {
    const username = req.query.username as string | undefined;

    let query = db
      .select()
      .from(bankingTransactions)
      .orderBy(desc(bankingTransactions.transactionDatetime))
      .$dynamic();

    if (username) {
      query = query.where(eq(bankingTransactions.username, username));
    }

    const rows = await query;

    const header = "id,username,transaction_type,amount,transaction_datetime";
    const csvRows = rows.map(
      (r) =>
        `${r.id},${r.username},${r.transactionType},${r.amount},${r.transactionDatetime}`,
    );
    const csv = [header, ...csvRows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="banking_export_${Date.now()}.csv"`,
    );
    res.send(csv);
  },
});
