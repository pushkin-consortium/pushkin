import path from 'path';
import fs from 'fs';
import jsYaml from 'js-yaml';
import knex from 'knex';

export default expDir => {
	// load exp config
	const expConfigPath = path.join(expDir, 'config.yaml');
	let expConfig;
	try { expConfig = jsYaml.safeLoad(fs.readFileSync(expConfigPath), 'utf8'); }
	catch (e) { console.error(`Failed to load config file for ${expDir}:\n\t${e}`); }

	// connect to the db specified for this experiment
	const pg = knex({
		client: 'pg',
		version: '7.2',
		connection: {
			host: expConfig.db.url,
			user: expConfig.db.user,
			password: expConfig.db.pass,
			database: expConfig.db.name
		}
	});

	// run the latest migration files inside specified migrations folder and then seed
	pg.migrate.latest({ directory: path.join(expDir, expConfig.migrations.location) })
		.then(() => {
			return pg.seed.run({ directory: path.join(expDir, expConfig.seeds.location) });
		})
		.then(() => {
			console.log(`Migrated and seeded ${expConfig.experimentName} successfully`);
			return;
		})
		.catch(err => {
			console.log(`Failed to migrate and seed experiment ${expConfig.experimentName}:\n\t${err}`);
		})
		.finally(() => {
			pg.destroy();
		});
};
