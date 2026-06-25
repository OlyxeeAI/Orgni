import { Router, type IRouter } from "express";
import { count, eq } from "drizzle-orm";
import { db, waitlistTable } from "@workspace/db";
import { JoinWaitlistBody, GetWaitlistCountResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/waitlist", async (req, res): Promise<void> => {
  const parsed = JoinWaitlistBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid waitlist input");
    res.status(400).json({ error: "Please enter a valid email address." });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const company = parsed.data.company?.trim() || null;

  const [existing] = await db
    .select({ id: waitlistTable.id })
    .from(waitlistTable)
    .where(eq(waitlistTable.email, email));

  if (existing) {
    res.status(409).json({ error: "You're already on the waitlist." });
    return;
  }

  try {
    const [entry] = await db
      .insert(waitlistTable)
      .values({ email, company })
      .returning();

    res.status(201).json({
      id: entry.id,
      email: entry.email,
      company: entry.company,
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "23505"
    ) {
      res.status(409).json({ error: "You're already on the waitlist." });
      return;
    }
    throw err;
  }
});

router.get("/waitlist/count", async (_req, res): Promise<void> => {
  const [row] = await db.select({ count: count() }).from(waitlistTable);
  res.json(GetWaitlistCountResponse.parse({ count: row?.count ?? 0 }));
});

export default router;
