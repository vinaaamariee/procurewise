import express from "express";
import { initTRPC } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { z } from "zod";

const t = initTRPC.create({ transformer: superjson });
const appRouter = t.router({
  test: t.procedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      console.log("Procedure executed with input:", input);
      return { success: true };
    }),
});

const app = express();
app.use(express.json());

// Simulate what vercelApiEntrypoint does: strips query string!
app.use((req, res, next) => {
  console.log("Original req.url:", req.url);
  // req.url stripped of query string:
  req.url = req.url.split("?")[0];
  console.log("Stripped req.url:", req.url);
  next();
});

app.use("/trpc", createExpressMiddleware({ router: appRouter }));

const server = app.listen(3999, async () => {
  // Now simulate httpBatchLink sending a POST request with ?batch=1 and body: {"0": ...}
  const payload = {
    0: {
      json: { name: "ProcureWise" },
    },
  };

  try {
    const res = await fetch("http://localhost:3999/trpc/test?batch=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response body:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch error:", err);
  } finally {
    server.close();
  }
});
