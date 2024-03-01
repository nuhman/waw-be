import dotenv from "dotenv";
import path from "path";
import pg from "pg";
import Postgrator from "postgrator";
import { fileURLToPath } from "url";
dotenv.config();

// Replicate __dirname behavior for ES Module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const clientOptions = {
    host: process.env.DBHOST,
    port: 5432,
    database: process.env.DBNAME,
    user: process.env.DBUSER,
    password: process.env.DBPASSWORD,
  };

  console.log("trying to connect to client", clientOptions);

  const client = new pg.Client(clientOptions);

  console.log("DB name: ", client.database.toString());
  try {
    await client.connect();
    console.log("client db CONNECTED!");
    const postgratorOptions = {
      migrationPattern: path.join(__dirname, "/migrations/*"),
      driver: "pg",
      database: process.env.DBNAME,
      // schemaTable: "migrations",
      // currentSchema: "public",
      execQuery: (query) => client.query(query),
    };
    console.log("trying to connect to postgrator", postgratorOptions);

    const postgrator = new Postgrator(postgratorOptions);

    postgrator.on("validation-started", (migration) =>
      console.log("validation-started", migration)
    );
    postgrator.on("validation-finished", (migration) =>
      console.log("validation-finished", migration)
    );
    postgrator.on("migration-started", (migration) =>
      console.log("migration-started", migration)
    );
    postgrator.on("migration-finished", (migration) =>
      console.log("migration-finished", migration)
    );

    // To get all migrations from directory and parse metadata
    const migrations = await postgrator.getMigrations();
    console.log("migrations", migrations);

    // Get max version available from filesystem, as number, not string
    const maxVersionAvailable = await postgrator.getMaxVersion();
    console.log("maxVersionAvailable", maxVersionAvailable);

    // "current" database schema version as number, not string
    const version = await postgrator.getDatabaseVersion();
    console.log("version", version);

    console.log("now migrations begin!");
    const result = await postgrator.migrate();
    console.log("result is here: ", result);

    if (result.length === 0) {
      console.log(
        'No migrations run for schema "public". Already at the latest one.'
      );
    } else {
      console.log(result);
    }

    console.log("Migration done.");

    process.exitCode = 0;
  } catch (err) {
    console.log("Migration errored out!");
    console.error(err);
    process.exitCode = 1;
  }
  console.log("closing client....");
  await client.end();
}
console.log("Outside migration func!");

await migrate();
