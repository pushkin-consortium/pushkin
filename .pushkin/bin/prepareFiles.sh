#!/bin/bash

##############################################
# sources
##############################################

set -e
pushkin_conf_dir="${1}"
source "${pushkin_conf_dir}/pushkin_config_vars.sh"

source "${pushkin_conf_dir}/bin/core.sh"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
cd "${pushkin_conf_dir}/.."
set -e

log () { echo "${boldFont}prepareFiles:${normalFont} ${1}"; }

api_controllers="${pushkin_api_controllers}"

cron_scripts="${pushkin_cron_scripts}"
cron_tab="${pushkin_cron_tab}"

db_migrations="${pushkin_db_worker_migrations}"
db_models="${pushkin_db_worker_models}"
db_seeds="${pushkin_db_worker_seeds}"

quizzes_dir="${pushkin_front_end_quizzes_dir}"
quizzes_list="${pushkin_front_end_quizzes_list}"

server_html="${pushkin_server_html}"

set +e

##############################################
# start
##############################################

set -e

log "cleaning"
rm -rf "${api_controllers}"/*
rm -rf "${cron_scripts}"/*
rm -rf "${db_migrations}"/*
rm -rf "${db_models}"/*
rm -rf "${db_seeds}"/*
rm -rf "${quizzes_dir}"/*
rm -rf "${server_html}"/*
echo "# This file created automatically" > "${cron_tab}"
echo "# Do not edit directly (your changes will be overwritten)" >> "${cron_tab}"

# there might be missing quiz files (i.e. no seeds)
set +e
for qPath in "${quizzes_dir}"/*; do
	qName=$(basename ${qPath})
	log "moving files for ${qName}"

	mkdir "${api_controllers}/${qName}"
	cp -r "${qPath}/api_controllers"/* "${api_controllers}/${qName}"

	mkdir "${cron_scripts}/${qName}"
	cp -r "${qPath}/cron_scripts/scripts/"*/* "${cron_scripts}/${qName}"
	cat "${qPath}/cron_scripts/crontab.txt" >> "${cron_tab}"

	cp -r "${qPath}/db_migrations/"* "${db_migrations}"

	mkdir "${db_models}/${qName}"
	cp "${qPath}/db_models/"* "${db_models}/${qName}"

	mkdir "${db_seeds}/${qName}"
	cp -r "${qPath}/db_seeds/"* "${db_seeds}/${qName}"

	mkdir "${quizzes_dir}/${qName}"
	cp -r "${qPath}/quiz_page/"* "${quizzes_dir}/${qName}"

	# quizzes/quizzes/[quiz]/db-workers does not need to be moved
	# because it's just docker and not physically referenced by anything
done
set +e

# make front-end quizzes "config" to be used by quiz page
log "creating quizzes list file (${quizzes_list})"

wqf () { echo ${1} >> "${pushkin_root}/${fe_quiz_list}"; }

echo '// This file created automatically' > "${pushkin_root}/$fe_quiz_list"
wqf "// Do not edit directly (your changes will be overwritten)"
wqf ''

for qPath in "${quizzes_dir}"/*; do
	qName=$(basename ${qPath})
	wqf "import ${qName} from './${qName}';"
done

wqf 'export default {'

for qPath in "${quizzes_dir}"/*; do
	qName=$(basename "${qPath}")
	wqf "	${qName}: ${qName},"
done

wqf '};'
