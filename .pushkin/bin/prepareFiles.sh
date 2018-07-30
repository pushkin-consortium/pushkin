#!/bin/bash

##############################################
# sources
##############################################

set -e
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
source "${pushkin_conf_dir}/bin/util/isQuiz.sh"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}prepareFiles:${normalFont} ${1}"; }

api_controllers="${pushkin_api_controllers}"

cron_scripts="${pushkin_cron_scripts}"
cron_tab="${pushkin_cron_tab}"

db_migrations="${pushkin_db_worker_migrations}"
db_seeds="${pushkin_db_worker_seeds}"

user_quizzes="${pushkin_user_quizzes}"

fe_quizzes_dir="${pushkin_front_end_quizzes_dir}"
fe_quizzes_list="${pushkin_front_end_quizzes_list}"
fe_dist="${pushkin_front_end_dist}"

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
rm -rf "${db_seeds}"/*
for qdir in "${fe_quizzes_dir}"/*; do
	base=$(basename "${qdir}")
	if [ "${base}" == "libraries" ]; then continue; fi
	rm -rf "${qdir}"
done
rm -rf "${server_html}"/*
echo "# This file created automatically" > "${cron_tab}"
echo "# Do not edit directly (your changes will be overwritten)" >> "${cron_tab}"

# there might be missing quiz files (i.e. no seeds)
set +e
for qPath in "${user_quizzes}"/*; do
	if ! isQuiz "${qPath}"; then continue; fi

	qName=$(basename ${qPath})
	log "moving files for ${qName}"

	mkdir "${api_controllers}/${qName}"
	cp -r "${qPath}/api_controller"/* "${api_controllers}/${qName}"

	mkdir "${cron_scripts}/${qName}"
	cp -r "${qPath}/cron_scripts/scripts/"*/* "${cron_scripts}/${qName}"
	cat "${qPath}/cron_scripts/crontab.txt" >> "${cron_tab}"

	cp -r "${qPath}/db_migrations/"* "${db_migrations}"

	mkdir "${db_seeds}/${qName}"
	cp -r "${qPath}/db_seeds/"* "${db_seeds}"

	mkdir "${fe_quizzes_dir}/${qName}"
	cp -r "${qPath}/quiz_page/"* "${fe_quizzes_dir}/${qName}"

	# quizzes/quizzes/[quiz]/worker does not need to be moved
	# because it's just docker and not physically referenced by anything
done
set +e

# make front-end quizzes "config" to be used by quiz page
log "creating quizzes list file (${fe_quizzes_list})"

wqf () { echo ${1} >> "${fe_quizzes_list}"; }

echo '// This file created automatically' > "${fe_quizzes_list}"
wqf "// Do not edit directly (your changes will be overwritten)"
wqf ''

for qPath in "${user_quizzes}"/*; do
	# already told about non quizzes in first loop
	silent=$(isQuiz "${qPath}")
	if (( "$?" > 0 )); then continue; fi

	qName=$(basename ${qPath})
	wqf "import ${qName} from './${qName}';"
done

wqf 'export default {'

for qPath in "${user_quizzes}"/*; do
	# already told about non quizzes in first loop
	silent=$(isQuiz "${qPath}")
	if (( "$?" > 0 )); then continue; fi

	qName=$(basename "${qPath}")
	wqf "	${qName}: ${qName},"
done

wqf '};'


log "done"
