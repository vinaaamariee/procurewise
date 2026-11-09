import { initTRPC } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { z } from "zod";

const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    console.log("errorFormatter issue:", error.message);
    return shape;
  }
});

const appRouter = t.router({
  test: t.procedure
    .input(z.object({ name: z.string() }))
    .mutation(({ input }) => {
      console.log("Procedure executed with input:", input);
      return { success: true };
    }),
});

const middleware = createExpressMiddleware({ router: appRouter });

function testRequest(url, body) {
  return new Promise((resolve) => {
    const pathOnly = url.split("?")[0];
    const queryString = url.includes("?") ? url.split("?")[1] : "";
    const req = {
      method: "POST",
      url,
      path: pathOnly,
      params: { 0: pathOnly.replace(/^\//, "") },
      headers: { "content-type": "application/json" },
      body,
      query: queryString ? Object.fromEntries(new URLSearchParams(queryString)) : {},
    };
    const res = {
      statusCode: 200,
      setHeader: () => {},
      once: () => {},
      on: () => {},
      emit: () => {},
      end: (data) => resolve(data ? JSON.parse(data) : {}),
    };
    middleware(req, res, (err) => resolve({ error: err }));
  });
}

async function run() {
  const batchBody = {
    0: {
      json: { name: "ProcureWise" },
    },
  };

  console.log("--- TEST 1: With ?batch=1 ---");
  const withBatchParam = await testRequest("/test?batch=1", batchBody);
  console.log("With ?batch=1:", JSON.stringify(withBatchParam));

  console.log("\n--- TEST 2: Without ?batch=1 ---");
  const withoutBatchParam = await testRequest("/test", batchBody);
  console.log("Without ?batch=1:", JSON.stringify(withoutBatchParam));
}

run();
