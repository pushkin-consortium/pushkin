#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='buildQuizzes'
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

user_quizzes="${pushkin_user_quizzes}"
quiz_name_suffix="${pushkin_user_quizzes_docker_suffix}"
set +e

##############################################
# start
##############################################

for qPath in "${user_quizzes}"/*; do
	if [ ! -d "${qPath}" ]; then
		# if there are no quizzes * won't expand, so ignore that
		continue
	fi
	qName=$(basename ${qPath})
	worker="${qPath}/worker"

	log "building quiz worker for ${qName}"

	docker build -t "${docker_repo}/${qName}${quiz_name_suffix}${docker_tag}" "${worker}"
done

log "done"
