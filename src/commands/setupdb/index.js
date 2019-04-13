import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';

export default (coreDBs, mainExpDir) => {
	// load up all migrations for same dbs to be run at same time (knex requires this)
	const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list
console.log("srsl")
	fs.readdirSync(mainExpDir).forEach(expDir => {
		expDir = path.join(mainExpDir, expDir);
		if (!fs.lstatSync(expDir).isDirectory()) return;

		// load exp config, skip if there isn't any
		const expConfigPath = path.join(expDir, 'config.yaml');
		let expConfig;
		try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); }
		catch (e) { console.error(`Failed to load config file for ${expDir}:\n\t${e}`); return; }
		console.log(expConfig);

		// add these migrations and seeds to the appropriate database
		const migsDir = path.join(expDir, expConfig.migrations.location);
		const seedsDir = path.join(expDir, expConfig.seeds.location);
		if (dbsToExps.has(expConfig.database))
			dbsToExps.get(expConfig.database).push({ migrations: migsDir, seeds: seedsDir });
		else
			dbsToExps.set(expConfig.database, [{ migrations: migsDir, seeds: seedsDir }]);
	});
console.log('got this far')
	// migrate and seed for each database
	dbsToExps.forEach((migAndSeedDirs, db) => {
		console.log(db, migAndSeedDirs);
		if (!coreDBs[db]) {
			console.error(`The database ${db} is not configured in pushkin.yaml`);
			return;
		}
		const dbInfo = coreDBs[db];
		const migDirs = migAndSeedDirs.map(i => i.migrations);
		const seedDirs = migAndSeedDirs.map(i => i.seeds);
console.log(dbInfo)	
console.log('hi')
		const pg = knex({
			client: 'pg',
			version: '7.2',
			connection: {
				host: dbInfo.url,
				user: dbInfo.user,
				password: dbInfo.pass,
				database: ''
			}
		});

		pg.migrate.latest({ directory: migDirs })
			.then(() => {
				return Promise.all(
					seedDirs.map(seedDir => (pg.seed.run({ directory: seedDir })))
				);
			})
			.then(() => {
				console.log('Setup databases successfully');
				return;
			})
			.catch(err => {
				console.log(`Failed to setup databases:\n\t${err}`);
			})
			.finally(() => {
				pg.destroy();
			});
	});
};
