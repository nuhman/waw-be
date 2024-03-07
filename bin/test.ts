import { configure, processCLIArgs, run } from "@japa/runner";
import { assert } from "@japa/assert";
import { apiClient } from "@japa/api-client";

// Alter env variables to suit testing needs
process.env.AUTH_RATE_LIMIT = "100";

processCLIArgs(process.argv.splice(2));
configure({
  files: ["tests/**/*.spec.ts"],
  plugins: [assert(), apiClient("http://localhost:3000")],
});

run();
