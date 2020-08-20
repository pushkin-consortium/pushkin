import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';
import { exec, execSync } from 'child_process';
import * as compose from 'docker-compose'

const shell = require('shelljs');

const fixConfig = function(configPath) {
  //stupid function to add key to experiment and users configs
  //This allows backwards compatibility

  let temp
  let config
  try {
    temp = fs.readFileSync(configPath, 'utf8')
    config = jsYaml.safeLoad(temp)
  } catch (e) {
    console.error('Failed to read users/config.yaml')
    throw e
  }

  if (!config.productionDB) {
    config.productionDB = "Main"
    try {
      temp = fs.writeFileSync(configPath, jsYaml.safeDump(config), 'utf8')
      console.log(`Updated users/config.yaml to be compatible with default site template v2+.`)
    } catch(e) {
      throw e
    }
  }

  return
}


export async function getMigrations(mainExpDir, production) {
  const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list
  // read userDB files
  const userDir = path.join(process.cwd(), 'users');
  const userConfigPath = path.join(userDir, 'config.yaml');
  fixConfig(userConfigPath) //this needs to finish running before we start loading migrations

  let userConfig;
  try { 
    userConfig = jsYaml.safeLoad(fs.readFileSync(userConfigPath), 'utf8'); 
  } catch (e) { 
    console.error(`Failed to load config file for ${userDir}:\n\t${e}`); 
    return; 
  }
  const userMigsDir = path.join(userDir, userConfig.migrations.location);
  const userDatabase = (production ? userConfig.productionDB : userConfig.database)
  console.log(`userMigsDir: ${userMigsDir}`)
  console.log(`userDatabase: ${userDatabase}`)

  if (dbsToExps.has(userDatabase)) { 
    dbsToExps.get(userDatabase).push({ migrations: userMigsDir, seeds: '' }); 
  } else { 
    dbsToExps.set(userDatabase, [{ migrations: userMigsDir, seeds: '' }]); 
  }

  // read experiment migrations
  let expConfig;
  //supposedly, forEach is blocking, so this block shouldn't cause us problems
  //with synchronicity
  fs.readdirSync(mainExpDir).forEach((eDir) => {
    console.log(`Loading migrations for ${eDir}`)
    const expDir = path.join(mainExpDir, eDir);
    if (!fs.lstatSync(expDir).isDirectory()) return;
    // load exp config, skip if there isn't any
    const expConfigPath = path.join(expDir, 'config.yaml');
    fixConfig(expConfigPath) //this needs to finish running before we start loading migrations
    try { 
      expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); 
    } catch (e) { 
      console.error(`Failed to load config file for ${expDir}:\n\t${e}`); 
      return; 
    }
    console.log(`expConfig:\n ${JSON.stringify(expConfig)}`)
    // add these migrations and seeds to the appropriate database
    const expDatabase = (production ? expConfig.productionDB : expConfig.database)
    const migsDir = path.join(expDir, expConfig.migrations.location);
    const seedsDir = path.join(expDir, expConfig.seeds.location);
    if (dbsToExps.has(expDatabase)) { 
      dbsToExps.get(expDatabase).push({ migrations: migsDir, seeds: seedsDir }); 
    } else { 
      dbsToExps.set(expDatabase, [{ migrations: migsDir, seeds: seedsDir }]); 
    }
  });

  return dbsToExps  
}

export async function runMigrations(dbsToExps, coreDBs) {
  console.log('starting migrations....');
  dbsToExps.forEach((migAndSeedDirs, db) => {
    console.log(`migAndSeedDirs:\n`, migAndSeedDirs)
    console.log( `db: ${db}`)
    if (!coreDBs[db]) {
      console.error(`The database ${db} is not configured in pushkin.yaml`);
      return;
    }
    let dbInfo = coreDBs[db];
    if (!dbInfo.host) {
      console.log(`No host listed for database ${dbInfo.name}. Defaulting to 'localhost'.`)
      dbInfo.host = 'localhost'
    }
    const migDirs = migAndSeedDirs.map((i) => i.migrations);
    const seedDirs = migAndSeedDirs.map((i) => i.seeds);
    const knexInfo = {
      client: 'pg',
      version: '11',
      connection: {
        host: dbInfo.host,
        user: dbInfo.user,
        password: dbInfo.pass,
        database: dbInfo.name,
      }
    }
    console.log(knexInfo) //FUBAR
    try {
     const pg = knex(knexInfo);
    } catch (e) {
      console.error(`Problem connecting to database.\n`, knexInfo)
      throw e
    }
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
        console.log('Set up databases successfully');
      })
      .catch((err) => {
        console.log(`Failed to set up databases:\n\t${err}`);
      })
      // .then(() => {
      //   //FUBAR for testing
      //   return Promise.all([pg('pushkin_users').insert({
      //       user_id: '1234',
      //       created_at: new Date()
      //     })])
      // })
      // .catch((err) => {
      //   console.error(`Some sort of problem with writing to pushkin_users`)
      //   throw err
      // })
      .finally(() => {
        pg.destroy();
      });
  })
}

export async function setupdb(coreDBs, mainExpDir) {
  // load up all migrations for same dbs to be run at same time (knex requires this)
  const dbPromise = compose.upOne('test_db', {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
    .then((resp) => resp, err => console.log('something went wrong starting database container:', err))

  const dbsToExps = await Promise.all([getMigrations(mainExpDir, false)])

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

      await runMigrations(dbsToExps, coreDBs)

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

export async function setupTransactionsDB(dbInfo, useIAM){
  console.log(`Creating transactions table in transactions database`)

  let createdTable;
  try {
    const pg = knex({
      client: 'pg',
      version: '11',
      connection: {
        host: dbInfo.host,
        user: dbInfo.user,
        password: dbInfo.pass,
        database: dbInfo.name,
      },
    });

    createdTable = pg.schema.createTable('transactions', function (table) {
      table.increments();
      table.string('query', 800).notNullable();
      table.string('bindings');
      table.timestamps();
    })
  } catch (e) {
    console.error(`Failed to setup transactions table in transactionsDB`)
    throw e
  }

  return createdTable
}