import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';
import * as compose from 'docker-compose'
import util from 'util';
const exec = util.promisify(require('child_process').exec);

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
    throw e 
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
    const seedDirs = migAndSeedDirs.map((i) => i.seeds).filter((el) => {return el != ""})
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
    let pg
    try {
     pg = knex(knexInfo);
    } catch (e) {
      console.error(`Problem connecting to database.\n`, knexInfo)
      throw e
    }
    pg.migrate.latest({ directory: migDirs })
      .then(() => {
        console.log(`Ran migrations for main database`)
        if (true) {
          return Promise.all(
            seedDirs.map((seedDir) => {
              console.log(`Running seeds on`, seedDir)
              let promiseSeed
              try {
                promiseSeed = pg.seed.run({ directory: seedDir })
              } catch(e) {
                console.error(`Problem running seed `, seedDir)
                throw e
              }
              return promiseSeed
            })
          );
        }
        return true;
      })
      .catch((err) => {
        console.error(`Problem running migrations.`)
        throw err
      })
      .then(() => {
        console.log('Set up databases successfully');
      })
      .catch((err) => {
        console.log(`Failed to set up databases:\n\t${err}`);
        throw err
      })
      .finally(() => {
        pg.destroy();
      });
  })
}

export async function setupTestTransactionsDB() {
  // The transactions db probably never needs to be updated. So set it up during installation and leave it.
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
    console.log(`No transaction db for local testing found in docker-compose.dev.yml. Creating.`)
    composeFile.services.test_transaction_db = {
      "image": 'postgres:11',
      "environment": {
        "POSTGRES_PASSWORD": 'example',
        "POSTGRES_DB": 'test_transaction_db'
      },
      "ports": ['5432:5432'],
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
      console.log(`Updating pushkin/docker-compose.dev.yml`)
      await fs.promises.writeFile(path.join(process.cwd(), 'pushkin/docker-compose.dev.yml'), jsYaml.safeDump(composeFile))
    } catch (e) {
      console.error(`Failed to write pushkin/docker-compose.dev.yml`)
      throw e
    }
    pushkinConfig.databases.localtransactiondb = {
      "user": "postgres",
      "pass": "example",
      "host": "localhost",
      "url": "test_transaction_db",
      "name": "test_transaction_db"
    }
    try {
      console.log(`Updating pushkin.yaml`)
      await fs.promises.writeFile(path.join(process.cwd(), 'pushkin.yaml'), jsYaml.safeDump(pushkinConfig))
    } catch (e) {
      console.error(`Failed to write pushkin.yaml`)
      throw e
    }
  }
  console.log('Finished updating configs')

  const dbPromise = exec('docker-compose -f pushkin/docker-compose.dev.yml up test_transaction_db')
    .then((resp) => resp, err => console.log('something went wrong starting database container:', err))

  //To wait for db to be up, this ridiculously roundabout loop...
  const wait = async () => {
    //Sometimes, I really miss loops
    let x = await exec (`docker ps -f name=pushkin_test_transaction_db_1`)
          .then((x) => {
            console.log('...')
            return x.stdout.search('healthy')
          },
          err => {console.error(err)})
    if (x > 0) {

      await setupTransactionsDB(pushkinConfig.databases.localtransactiondb)

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


export async function setupdb(coreDBs, mainExpDir) {
  // load up all migrations for same dbs to be run at same time (knex requires this)
  const dbPromise = compose.upOne('test_db', {cwd: path.join(process.cwd(), 'pushkin'), config: 'docker-compose.dev.yml'})
    .then((resp) => resp, err => console.log('something went wrong starting database container:', err))

  const dbsToExps = await getMigrations(mainExpDir, false)

  //By this point, with any luck the DB is up and running.
  //But just in case, this ridiculously roundabout loop...
  const wait = async () => {
    //Sometimes, I really miss loops
    let x = await exec (`docker ps -f name=pushkin_test_db_1`)
          .then((x) => {
            console.log('...')
            return x.stdout.search('healthy')
          },
          err => {console.error(err)})
    if (x > 0) {

      await runMigrations(dbsToExps, coreDBs)
    // let info = await completedDBs
    // let setupTransactionsTable
    // try {
    //   setupTransactionsTable = setupTransactionsDB(info.productionDBs.Transaction);
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

export async function setupTransactionsDB(dbInfo){
  console.log(`See if a migrations file for transactions exists`)
  const migDir = path.join(process.cwd(), "coreMigrations")
  try {
    await fs.promises.mkdir(migDir, {recursive: true})
  } catch (e) {
    throw e    
  }

  try {
    await fs.promises.readFile(path.join(migDir, "migrateTransactions.js"))
    console.log(`Migrations for transactions db already exist. Skipping creation.`)
  } catch (e) {
    console.log(`Migrations file for transactions table doesn't exist yet. Creating.`)
    fs.promises.writeFile(path.join(migDir, "migrateTransactions.js"), 
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
  try {
    console.log(`Running migrations for transactions database`)
    const knexInfo = {
      client: 'pg',
      version: '11',
      connection: {
        host: dbInfo.host,
        user: dbInfo.user,
        password: dbInfo.pass,
        database: dbInfo.name,
      },
    }
    const pg = knex(knexInfo);
    pg.migrate.latest({ directory: migDir })
    .then(() => {
      pg.destroy();
    })
  } catch (e) {
    console.error(`Problem running migrations for transactions database`)
    throw e
  }

  return
}