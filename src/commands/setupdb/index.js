import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';
import { exec, execSync } from 'child_process';
import * as compose from 'docker-compose'

const shell = require('shelljs');

export default async (coreDBs, mainExpDir) => {
  // load up all migrations for same dbs to be run at same time (knex requires this)
  const dbPromise = compose.upOne('test_db', {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
    .then((resp) => resp, err => console.log('something went wrong starting database container:', err))

  const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list

  // read userDB files
  const userDir = path.join(process.cwd(), 'users');
  const userConfigPath = path.join(userDir, 'config.yaml');
  let userConfig;
  try { 
    userConfig = jsYaml.safeLoad(fs.readFileSync(userConfigPath), 'utf8'); 
  } catch (e) { 
    console.error(`Failed to load config file for ${userDir}:\n\t${e}`); 
    return; 
  }
  const userMigsDir = path.join(userDir, userConfig.migrations.location);
  if (dbsToExps.has(userConfig.database)) { 
    dbsToExps.get(userConfig.database).push({ migrations: userMigsDir, seeds: '' }); 
  } else { 
    dbsToExps.set(userConfig.database, [{ migrations: userMigsDir, seeds: '' }]); 
  }

  // read experiment migrations
  let expConfig;
  //supposedly, forEach is blocking, so this block shouldn't cause us problems
  //with synchronicity
  fs.readdirSync(mainExpDir).forEach((expDir) => {
    expDir = path.join(mainExpDir, expDir);
    if (!fs.lstatSync(expDir).isDirectory()) return;

    // load exp config, skip if there isn't any
    const expConfigPath = path.join(expDir, 'config.yaml');
    try { 
      expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); 
    } catch (e) { 
      console.error(`Failed to load config file for ${expDir}:\n\t${e}`); 
      return; 
    }

    // add these migrations and seeds to the appropriate database
    const migsDir = path.join(expDir, expConfig.migrations.location);
    const seedsDir = path.join(expDir, expConfig.seeds.location);
    if (dbsToExps.has(expConfig.database)) { 
      dbsToExps.get(expConfig.database).push({ migrations: migsDir, seeds: seedsDir }); 
    } else { 
      dbsToExps.set(expConfig.database, [{ migrations: migsDir, seeds: seedsDir }]); 
    }
  });

  //By this point, with any luck the DB is up and running.
  //But just in case, this ridiculously roundabout loop...
  const wait = async () => {
    //Sometimes, I really miss loops
    let x = await compose.ps({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
          .then((x) => {
            console.log('...')
            return x.out.search('healthy')
          },
                err => {console.error(err)})
    if (x > 0) {
      console.log(dbsToExps);
      console.log(coreDBs);
      console.log('starting migrations...');
      dbsToExps.forEach((migAndSeedDirs, db) => {
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
      })
      return compose.stop({cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
      .then(
        out => { console.log(out.out, 'Database updated. Shutting down...')},
        err => { console.log('something went wrong:', err.message)}
      );

    } else {
      setTimeout( wait, 1000 );
    }
  }

    console.log('Waiting for database to start...')
    const dbStarted = await wait(); //this variable doesn't get used.

  // migrate and seed for each database
}
