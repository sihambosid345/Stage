import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});