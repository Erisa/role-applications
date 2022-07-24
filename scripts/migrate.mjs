import fs from 'fs/promises';
import fetch from 'node-fetch';
import process from 'process';
import toml from 'toml';

import { homedir } from 'os';

const verbose = true;

if (process.argv.length < 3) {
  console.error('Usage: [db_name]');
  process.exit(1);
}

const dbName = process.argv[2];

const wranglerToml = toml.parse(await fs.readFile('wrangler.toml'));
const db = wranglerToml.d1_databases.find((d) => d.database_name === dbName).database_id;
if (verbose) console.log(`[DEBUG] db: ${db}`);

const accountId = wranglerToml.account_id;

const config = toml.parse(await fs.readFile(`${homedir()}/.config/.wrangler/config/default.toml`));
const oauthToken = config.oauth_token;

async function execute(sql) {
  // Get the current version
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${db}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${oauthToken}`
    },
    body: JSON.stringify({ sql })
  });

  const json = await res.json();

  if (verbose) {
    console.log('[DEBUG] Ran:', sql);
    console.log('[DEBUG]   Result:', json);
  }

  if (res.ok && json.success) {
    const result = json.result[0];
    return { success: true, result: result.results.length > 0 ? result.results[0] : {} };
  } else {
    // console.error('[execute failed]', json);
    return { success: false, error: json.result[0].error };
  }
}

async function getMigrationVersion() {
  const versionResult = await execute(
    'SELECT `current_version` FROM `__migration` ORDER BY `migrated_at` DESC LIMIT 1'
  );

  // No migration table yet
  if (!versionResult.success && versionResult.error.includes('no such table')) {
    // Create it
    const res = await execute(
      'CREATE TABLE IF NOT EXISTS `__migration` (`current_version` TEXT NOT NULL PRIMARY KEY, `migrated_at` TEXT NOT NULL);'
    );
    if (!res.success) {
      console.error('Failed to create migrations table. Error: ' + res.error);
      process.exit(1);
    }

    return 0;
  }

  const result = versionResult.result;

  if (!result.current_version) {
    return 0;
  }

  // Parse the date into a number
  return new Number(result.current_version.replace('_', ''));
}

async function updateMigrationVersion(newVersion) {
  const res = await execute(
    `INSERT INTO __migration(current_version, migrated_at) VALUES('${newVersion}', datetime('now'))`
  );
  if (res.success) {
    console.log();
    console.log('Migration complete!');
  }
}

async function run() {
  // Find the current migration
  const migrationVersion = await getMigrationVersion();

  let latestVersion;
  // Go through the migration files
  for (const file of await fs.readdir('migrations')) {
    const date = file.substring(0, file.indexOf('__'));
    const verNumber = new Number(date.replaceAll('_', ''));

    if (verNumber > migrationVersion) {
      const sql = await fs.readFile('migrations/' + file, 'utf8');

      const res = await execute(sql);
      if (res.success) {
        console.log(`[+] Ran migration ${file}`);
      } else {
        console.error(`[-] Migration failed!`);
        console.error(`  ${res.error}`);
        break;
      }
    }
    latestVersion = date;
  }

  // Update the migration version
  await updateMigrationVersion(latestVersion);
}

run();
