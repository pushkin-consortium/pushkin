#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='syncQuizzes'
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
source "${pushkin_env_file}"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; }
die () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; exit 1; }

docker_repo="${image_prefix}"
docker_tag="${image_tag}"
if [ ! -z "${docker_tag}" ]; then
	docker_tag=":${docker_tag}"
fi
quiz_name_suffix="${pushkin_user_quizzes_docker_suffix}"
user_quizzes="${pushkin_user_quizzes}"

set +e

##############################################
# start
##############################################

for qPath in "${user_quizzes}"/*; do
	if ! isQuiz "${qPath}"; then continue; fi

	qName=$(basename ${qPath})
	log "syncing docker worker for quiz ${qName}"
	docker push "${docker_repo}/${qName}${quiz_name_suffix}${docker_tag}"
done



log "done"
