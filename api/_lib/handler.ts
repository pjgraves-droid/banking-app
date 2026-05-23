import type { VercelRequest, VercelResponse } from "@vercel/node";

type Methods = Record<
  string,
  (req: VercelRequest, res: VercelResponse) => Promise<void>
>;

export function apiHandler(methods: Methods) {
  return async (req: VercelRequest, res: VercelResponse) => {
    try {
      const method = req.method || "GET";
      const handler = methods[method];
      if (!handler) {
        res.status(405).json({ detail: "Method not allowed" });
        return;
      }
      await handler(req, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ detail: "Internal server error" });
    }
  };
}
