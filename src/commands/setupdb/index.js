import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';

export default (coreDBs, mainExpDir) => {
	// load up all migrations for same dbs to be run at same time (knex requires this)
	const dbsToExps = new Map(); // which dbs -> { migrations, seeds } list
	fs.readdirSync(mainExpDir).forEach(expDir => {
		expDir = path.join(mainExpDir, expDir);
		if (!fs.lstatSync(expDir).isDirectory()) return;

		// load exp config, skip if there isn't any
		const expConfigPath = path.join(expDir, 'config.yaml');
		let expConfig;
		try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); }
		catch (e) { console.error(`Failed to load config file for ${expDir}:\n\t${e}`); return; }

		// add these migrations and seeds to the appropriate database
		const migsDir = path.join(expDir, expConfig.migrations);
		const seedsDir = path.join(expDir, expConfig.seeds);
		if (dbsToExps.has(expConfig.database))
			dbsToExps.get(expConfig.database).push({ migrations: migsDir, seeds: seedsDir });
		else
			dbsToExps.set(expConfig.database, [{ migrations: migsDir, seeds: seedsDir }]);
	});

	// migrate and seed for each database
	for (db in dbsToExps.keys()) {
		if (!coreDBs[db]) {
			console.error(`The database ${db} is not configured in pushkin.yaml`);
			return;
		}
		const dbInfo = coreDBs[db];
		const migDirs = dbsToExps.get(db).map(i => i.migrations);
		const seedDirs = dbsToExps.get(db).map(i => i.seeds);

		const pg = knex({
			client: 'pg',
			version: '7.2',
			connection: {
				host: dbInfo.url,
				user: dbInfo.user,
				password: dbInfo.pass,
				database: dbInfo.name
			}
		});

		pg.migrate.latest({ directory: migrations })
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
	}
};
