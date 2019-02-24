#! /bin/bash

source ../.env
psql "postgres://${db_user}:${db_pass}@localhost/" -c "create database ${db_name}"
sed -e "s/\${db_user}/${db_user}/g" \
	-e "s/\${db_pass}/${db_pass}/g" \
	-e "s/\${db_name}/${db_name}/g" \
	knexfile.withHoles.js > knexfile.fromSetup.sh.js
npm run knex -- --knexfile knexfile.fromSetup.sh.js migrate:latest
npm run knex -- --knexfile knexfile.fromSetup.sh.js seed:run
