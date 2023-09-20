import path from 'path';
import fs from 'graceful-fs';
import jsYaml from 'js-yaml';
import knex from 'knex';
import * as compose from 'docker-compose'
import util from 'util';
const exec = util.promisify(require('child_process').exec);

const shell = require('shelljs');

const fixConfig = function(configPath, verbose) {
  //stupid function to add key to experiment and users configs
  //This allows backwards compatibility
  
  if (verbose) console.log('--verbose flag set inside fixConfig()');
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
    config.productionDB = "Main";
    try {
      temp = fs.writeFileSync(configPath, jsYaml.safeDump(config), 'utf8');
      if (verbose) console.log(`Updated users/config.yaml to be compatible with default site template v2+.`);
    } catch(e) {
      throw e;
    }
  }

  return
}

export async function getMigrations(mainExpDir, production, verbose) {
  if (verbose) console.log('--verbose flag set inside getMigrations()');
  const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list
  // read userDB files
  const userDir = path.join(process.cwd(), 'users');
  const userConfigPath = path.join(userDir, 'config.yaml');
  fixConfig(userConfigPath, verbose) //this needs to finish running before we start loading migrations

  let userConfig;
  try { 
    userConfig = jsYaml.safeLoad(fs.readFileSync(userConfigPath), 'utf8'); 
  } catch (e) { 
    console.error(`Failed to load config file for ${userDir}:\n\t${e}`); 
    throw e 
  }
  const userMigsDir = path.join(userDir, userConfig.migrations.location);
  const userDatabase = (production ? userConfig.productionDB : userConfig.database);
  if (verbose) console.log(`userMigsDir: ${userMigsDir}`);
  if (verbose) console.log(`userDatabase: ${userDatabase}`);

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
    if (verbose) console.log(`Loading migrations for ${eDir}`);
    const expDir = path.join(mainExpDir, eDir);
    if (!fs.lstatSync(expDir).isDirectory()) return;
    // load exp config, skip if there isn't any
    const expConfigPath = path.join(expDir, 'config.yaml');
    fixConfig(expConfigPath, verbose) //this needs to finish running before we start loading migrations
    try { 
      expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); 
    } catch (e) { 
      console.error(`Failed to load config file for ${expDir}:\n\t${e}`); 
      return; 
    }
    if (verbose) console.log(`expConfig:\n ${JSON.stringify(expConfig)}`);
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

export async function runMigrations(dbsToExps, coreDBs, verbose) {
  if (verbose) console.log('--verbose flag set inside runMigrations()');
  let ranMigrations = []
  try {
    dbsToExps.forEach((migAndSeedDirs, db) => {
      if (!coreDBs[db]) {
        console.error(`The database ${db} is not configured in pushkin.yaml`);
        return;
      }
      let dbInfo = coreDBs[db];
      if (!dbInfo.host) {
        if (verbose) console.log(`No host listed for database ${dbInfo.name}. Defaulting to 'localhost'.`);
        dbInfo.host = 'localhost';
      }
      const migDirs = migAndSeedDirs.map((i) => i.migrations);
      const seedDirs = migAndSeedDirs.map((i) => i.seeds).filter((el) => {return el != ""})
      const knexInfo = {
        client: 'pg',
        version: '11',
        connection: {
          host: dbInfo.url,
          user: dbInfo.user,
          port: dbInfo.port,
          password: dbInfo.pass,
          database: dbInfo.name,
        }
      }
      let pg
      try {
      pg = knex(knexInfo);
      } catch (e) {
        console.error(`Problem connecting to database.\n`, knexInfo)
        throw e
      }
      ranMigrations.push(new Promise(async (resolve, reject) => {
        if (verbose) console.log(`Running migrations for ${db}`);
        try {
          await pg.migrate.latest({ directory: migDirs });
        } catch (e) {
          console.error(`Problem running migrations for ${db}`);
          throw e;
        }
        if (verbose) console.log(`Ran migrations for ${db}`);

        let runSeeds = async (seedDir, verbose) => {
          if (verbose) console.log('--verbose flag set inside runSeeds()');
          //run seeds, if any
          if (verbose) console.log(`Running seeds on`, seedDir);
          let promiseSeed;
          try {
            promiseSeed = pg.seed.run({ directory: seedDir });
          } catch(e) {
            console.error(`Problem running seed `, seedDir);
            throw e;
          }
          return promiseSeed;
        }

        let ranSeeds;
        try {
          ranSeeds = seedDirs.map((seedDir) => runSeeds(seedDir, verbose));
        } catch (e) {
          console.error(`Problem running seeds for ${db}`);
          throw e;
        }

        await Promise.all(ranSeeds);

        pg.destroy();
        resolve(true);
      }))
    })
  } catch (e) {
    throw e;
  }
  return Promise.all(ranMigrations);
}

export async function setupTestTransactionsDB(verbose) {
  //FUBAR could make a lot more use of asyncronous functions here
  if (verbose) console.log('--verbose flag set inside setupTestTransactionsDB()');
  let composeFile, pushkinConfig, temp
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'))
    composeFile = jsYaml.safeLoad(temp)
  } catch (e) {
    console.error(`Failed to load pushkin/docker-compose.dev.yml`)
    throw e
  }
  try {
    temp = await fs.promises.readFile(path.join(process.cwd(), 'pushkin.yaml'))
    pushkinConfig = jsYaml.safeLoad(temp)
  } catch (e) {
    console.error(`Failed to load pushkin.yaml`)
    throw e
  }
  if (!composeFile.test_transaction_db) {
    if (verbose) console.log(`No transaction db for local testing found in docker-compose.dev.yml. Creating.`);
    composeFile.services.test_transaction_db = {
      "image": 'postgres:11',
      "environment": {
        "POSTGRES_PASSWORD": 'example',
        "POSTGRES_DB": 'test_transaction_db'
      },
      "ports": ['5433:5432'],
      "volumes": ['test_transaction_db_volume:/var/lib/postgresql/data'],
      "healthcheck": {
        "test": [ 'CMD-SHELL', 'pg_isready -U postgres'],
        "interval": '10s',
        "timeout": '5s',
        "retries": 5
      }
    }
    composeFile.volumes.test_transaction_db_volume = null
    try {
      if (verbose) console.log(`Updating pushkin/docker-compose.dev.yml to include transation db`);
      await fs.promises.writeFile(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), jsYaml.safeDump(composeFile))
    } catch (e) {
      console.error(`Failed to write pushkin/docker-compose.dev.yml`)
      throw e
    }
    pushkinConfig.databases.localtransactiondb = {
      "user": "postgres",
      "pass": "example",
      "host": "test_transaction_db",
      "port": "5433",
      "url": "localhost",
      "name": "test_transaction_db"
    }
    try {
      if (verbose) console.log(`Updating pushkin.yaml`);
      await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig))
    } catch (e) {
      console.error(`Failed to write pushkin.yaml`)
      throw e
    }
  }
  if (verbose) {
    console.log('Finished updating configs for test transactions db');
    console.log(`See if a migrations file for transactions exists`);
  }
  const migDir = path.join(process.cwd(), "coreMigrations")
  try {
    await fs.promises.mkdir(migDir, {recursive: true})
  } catch (e) {
    throw e    
  }

  try {
    await fs.promises.readFile(path.join(migDir, "migrateTransactions.js"))
    if (verbose) console.log(`Migrations for transactions db already exist. Skipping creation.`);
  } catch (e) {
    if (verbose) console.log(`Migrations file for transactions table doesn't exist yet. Creating.`);
    await fs.promises.writeFile(path.join(migDir, "migrateTransactions.js"), 
      "exports.up = function(knex) { \
        return knex.schema.createTable('transactions', function (table) { \
            table.increments(); \
            table.string('query', 800).notNullable(); \
            table.string('bindings'); \
            table.timestamps(); \
          }); \
      };\
      \
      exports.down = function(knex) {\
        return knex.schema.dropTable('transactions');\
      };\
      "
    )
  }
  return true
}

export async function migrateTransactionsDB(coreDBs, verbose) {
  if (verbose) console.log('--verbose flag set inside migrateTransactionsDB()');
  return new Promise(async (resolve, reject) => {
    const waitforTrans = async (verbose) => {
      if (verbose) {
        console.log('--verbose flag set inside waitforTrans()');
        console.log('Waiting for test transaction db...');
      }
      let x = await exec(`docker ps --format "{{.Names}} {{.Status}}" | awk '/pushkin[-_]test_transaction_db[-_]1/ {print $0}'`);
      if (x.stdout.search('healthy') > 0) {
        if (verbose) console.log('Test transaction db is healthy');
        let transMigrations = new Map();
        if (verbose) console.log(`Starting migrations for test transactions DB.`);
        transMigrations.set('localtransactiondb', [{ migrations: path.join(process.cwd(), 'coreMigrations'), seeds: '' }]); 
        let ranMigrations;
        try {
          ranMigrations = runMigrations(transMigrations, coreDBs, verbose);
        } catch(e) {
          console.error(`Problem running migrations for transactions table`);
          throw e;
        } 
        resolve(ranMigrations);
      } else {
      setTimeout(waitforTrans(verbose), 2500);
    }
  };
  waitforTrans(verbose)
  })
}

export async function setupdb(coreDBs, mainExpDir, verbose) {
  if (verbose) console.log('--verbose flag set inside setupdb()');
  // load up all migrations for same dbs to be run at same time (knex requires this)

  let dbPromise;
  if (verbose) console.log("Spooling up databases.");
  try {
    dbPromise = compose.upMany(
      ['test_db', 'test_transaction_db'],
      {
      cwd: path.join(process.cwd(), 'pushkin'),
      config: 'docker-compose.dev.yml',
    });  
  } catch {
    console.error('something went wrong starting database containers.');
    throw e;
  }

  let dbsToExps
  try {
    dbsToExps = await getMigrations(mainExpDir, false, verbose);
  } catch (e) {
    console.error(`Problem getting migrations`);
    throw e;
  }

  await dbPromise //no point in going on until this much is run

  let migrateExperiments = async (dbsToExps, verbose) => {
    if (verbose) console.log('--verbose flag set inside migrateExperiments()');
    return new Promise(async (resolve, reject) => {
      const waitforMain = async (verbose) => {
        if (verbose) {
          console.log('--verbose flag set inside waitforMain()');
          console.log('Waiting for test db...');
        }
        let x = await exec(`docker ps --format "{{.Names}} {{.Status}}" | awk '/pushkin[-_]test_db[-_]1/ {print $0}'`);
        if (x.stdout.search('healthy') > 0) {
          if (verbose) console.log('Test test db is healthy');
          let migrateExpDBs;
          try {
            migrateExpDBs = runMigrations(dbsToExps, coreDBs, verbose);
          } catch (e) {
            console.error(`Problem running migrations for experiment databases`);
            throw e;
          }
          resolve(migrateExpDBs)
        } else {
        setTimeout(waitforMain(verbose), 2500);
        }
      };
      waitforMain(verbose);
    })
  }

  let setupTransactionsTable
  try {
    //Note that migrateTransactionsDB() launches that DB and waits for it
    setupTransactionsTable = migrateTransactionsDB(coreDBs, verbose);
  } catch (error) {
    console.error(`Problem running migrations for transactions table`)
    throw error
  }

  let migrateExperimentsDBs
  try {
    //Note that migrateExperiments() launches that DB and waits for it
    migrateExperimentsDBs = migrateExperiments(dbsToExps, verbose)
  } catch (e) {
    console.error(`Problem running migrations for experiment databases`)
    throw e
  }

  await Promise.all([migrateExperimentsDBs, setupTransactionsTable]) //wait for all migrations to finish

  if (verbose) console.log('Finished running all migrations. Shutting down database containers.');
  let stopDB = async (dockerPath, dockerConfig) => {
    return compose.stop({cwd: dockerPath, config: dockerConfig});
  }

  let stoppedDB;
  try {
    stoppedDB = await stopDB(path.join(process.cwd(), 'pushkin'), 'docker-compose.dev.yml');
  } catch (e) {
    console.error(`Problem stopping database`);
    throw e;
  }

  return stoppedDB;
}
