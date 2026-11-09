import fs from "fs";

const routers = fs.readFileSync("server/routers.ts", "utf8");

const regex = /(\w+):\s*(protectedProcedure|publicProcedure)[\s\S]*?\.input\(\s*(z\.object\([\s\S]*?\))\s*\)\s*\.(mutation|query)/g;

let match;
const list = [];
while ((match = regex.exec(routers)) !== null) {
  const name = match[1];
  const schema = match[3];
  const isOptional = schema.endsWith(".optional()");
  list.push({ name, isOptional });
}

console.log(JSON.stringify(list, null, 2));
