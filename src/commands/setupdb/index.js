import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';
import { exec, execSync } from 'child_process';

const shell = require('shelljs');

export default (coreDBs, mainExpDir) => {
  // load up all migrations for same dbs to be run at same time (knex requires this)
  shell.exec('docker-compose -f pushkin/docker-compose.dev.yml start test_db', { cwd: process.cwd() }, (err) => {
    if (err) {
      console.error(`Failed to start test dabase: ${err}`); // no return after
      return;
    }
    const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list

    // read userDB files
    const userDir = path.join(process.cwd(), 'users');
    const userConfigPath = path.join(userDir, 'config.yaml');
    console.log(userConfigPath);
    let userConfig;
    try { userConfig = jsYaml.safeLoad(fs.readFileSync(userConfigPath), 'utf8'); } catch (e) { console.error(`Failed to load config file for ${userDir}:\n\t${e}`); return; }
    const userMigsDir = path.join(userDir, userConfig.migrations.location);
    if (dbsToExps.has(userConfig.database)) { dbsToExps.get(userConfig.database).push({ migrations: userMigsDir, seeds: '' }); } else { dbsToExps.set(userConfig.database, [{ migrations: userMigsDir, seeds: '' }]); }

    // read experiment migrations
    let expConfig;
    fs.readdirSync(mainExpDir).forEach((expDir) => {
      expDir = path.join(mainExpDir, expDir);
      if (!fs.lstatSync(expDir).isDirectory()) return;

      // load exp config, skip if there isn't any
      const expConfigPath = path.join(expDir, 'config.yaml');
      try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); } catch (e) { console.error(`Failed to load config file for ${expDir}:\n\t${e}`); return; }

      // add these migrations and seeds to the appropriate database
      const migsDir = path.join(expDir, expConfig.migrations.location);
      const seedsDir = path.join(expDir, expConfig.seeds.location);
      if (dbsToExps.has(expConfig.database)) { dbsToExps.get(expConfig.database).push({ migrations: migsDir, seeds: seedsDir }); } else { dbsToExps.set(expConfig.database, [{ migrations: migsDir, seeds: seedsDir }]); }
    });


    // migrate and seed for each database
    console.log(dbsToExps);
    console.log(coreDBs);
    console.log('starting migrations...');
    dbsToExps.forEach((migAndSeedDirs, db) => {
      console.log(db);
      console.log('dirs');
      console.log(migAndSeedDirs);
      if (!coreDBs[db]) {
        console.error(`The database ${db} is not configured in pushkin.yaml`);
        return;
      }
      const dbInfo = coreDBs[db];
      const migDirs = migAndSeedDirs.map((i) => i.migrations);
      const seedDirs = migAndSeedDirs.map((i) => i.seeds);
      const pg = knex({
        client: 'pg',
        version: '7.2',
        connection: {
          host: dbInfo.url,
          user: dbInfo.user,
          password: dbInfo.pass,
          database: dbInfo.name,
        },
      });
      pg.migrate.latest({ directory: migDirs })
        .then(() => {
          if (expConfig.seeds.location) {
            return Promise.all(
              seedDirs.map((seedDir) => (pg.seed.run({ directory: seedDir }))),
            );
          }
          return true;
        })
        .then(() => {
          console.log('Setup databases successfully');
        })
        .catch((err) => {
          console.log(`Failed to setup databases:\n\t${err}`);
        })
        .finally(() => {
          pg.destroy();
        });
    });
    shell.exec('docker-compose -f pushkin/docker-compose.dev.yml stop test_db', (err) => {
      if (err) {
        console.error(`Failed to stop test dabase: ${err}`); // no return after
      }
    });
  });
};
