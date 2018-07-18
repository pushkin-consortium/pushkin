#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='newQuiz'
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; }
die () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; exit 1; }

user_quizzes="${pushkin_user_quizzes}"
templates=".pushkin/newQuizTemplates"

if [ ! -z "${1}" ]; then
	qname=$(echo "${1}" | tr '[:upper:]' '[:lower:]')
	if [ -d "${user_quizzes}"/"${qname}" ]; then
		die "A quiz named '${qname}' already exists."
	fi
else
	die "not a valid quiz name"
fi

set +e

##############################################
# start
##############################################

set -e


mkdir "${user_quizzes}/${qname}"
mkdir "${user_quizzes}/${qname}"/api_controllers
mkdir "${user_quizzes}/${qname}"/cron_scripts
mkdir "${user_quizzes}/${qname}"/db_models
mkdir "${user_quizzes}/${qname}"/db_migrations
mkdir "${user_quizzes}/${qname}"/db_seeds
mkdir "${user_quizzes}/${qname}"/worker
mkdir "${user_quizzes}/${qname}"/quiz_page

#### add default starting files (names are set) #####

# db workers
sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/worker/docker_compose_appendage.yml > "${user_quizzes}/${qname}/worker/docker_compose_appendage.yml"
sed -i -e "s/\${pushkin_user_quizzes_docker_suffix}/${pushkin_user_quizzes_docker_suffix}/" "${user_quizzes}/${qname}/worker/docker_compose_appendage.yml"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/worker/start.sh > "${user_quizzes}/${qname}/worker/start.sh"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/worker/worker.py > "${user_quizzes}/${qname}/worker/worker.py"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/worker/handleResponse.py > "${user_quizzes}/${qname}/worker/handleResponse.py"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/worker/dbLogger.py > "${user_quizzes}/${qname}/worker/dbLogger.py"

cp "${templates}"/worker/Dockerfile "${user_quizzes}/${qname}/worker/Dockerfile"

# api controller
sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/api_controller/index.js > "${user_quizzes}/${qname}/api_controllers/index.js"
cp "${templates}"/api_controller/RPCParams.js "${user_quizzes}/${qname}/api_controllers/RPCParams.js"

# db models
cp -r "${templates}"/db_models/* "${user_quizzes}/${qname}/db_models/"

# db migrations
# NB: The order of these migrations matters (the timestamps must be consecutive in the following order because of relational dependencies)
# changing will cause knex migrations to fail
timestamp () { date +"%Y%m%d%H%M%S"; sleep 1; }
sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/db_migrations/TIMESTAMP_create_QUIZNAME_stimuli.js > "${user_quizzes}/${qname}/db_migrations/$(timestamp)_create_${qname}_stimuli.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/db_migrations/TIMESTAMP_create_QUIZNAME_users.js > "${user_quizzes}/${qname}/db_migrations/$(timestamp)_create_${qname}_users.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/db_migrations/TIMESTAMP_create_QUIZNAME_stimulusResponses.js > "${user_quizzes}/${qname}/db_migrations/$(timestamp)_create_${qname}_stimulusResponses.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/db_migrations/TIMESTAMP_create_QUIZNAME_responses.js > "${user_quizzes}/${qname}/db_migrations/$(timestamp)_create_${qname}_responses.js"

# cron
echo '# contents of this file auto-appended to cron/crontab during build' > "${user_quizzes}/${qname}/cron_scripts/crontab.txt"
echo "* 0 0 0 0 root /scripts/${qname}/exampleCron.py" >> "${user_quizzes}/${qname}/cron_scripts/crontab.txt"
mkdir -p "${user_quizzes}/${qname}/cron_scripts/scripts/${qname}/"
touch "${user_quizzes}/${qname}/cron_scripts/scripts/${qname}/exampleCron.py"

# quiz page
sed -e "s/\${QUIZ_NAME}/${qname}/" "${templates}"/quiz_page/index.js > "${user_quizzes}/${qname}/quiz_page/index.js"
cp "${templates}"/quiz_page/styles.scss "${user_quizzes}/${qname}/quiz_page/"

log "done"
