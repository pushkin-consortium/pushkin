#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='build'
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

set +e

##############################################
# start
##############################################


toBuild="${1}"
shift
case "${toBuild}" in
	"api")
		log "building api as '${pushkin_api_docker_name}'"
		docker build -t "${image_prefix}/${pushkin_api_docker_name}:${image_tag}" "${pushkin_api}"
		log "done"
		;;
	"cron")
		log "building cron as '${pushkin_cron_docker_name}'"
		docker build -t "${image_prefix}/${pushkin_cron_docker_name}:${image_tag}" "${pushkin_cron}"
		log "done"
		;;
	"dbworker")
		log "building db_worker as '${pushkin_db_worker_docker_name}'"
		docker build -t "${image_prefix}/${pushkin_db_worker_docker_name}:${image_tag}" "${pushkin_db_worker}"
		log "done"
		;;
	"server")
		log "building server as '${pushkin_server_docker_name}'"
		docker build -t "${image_prefix}/${pushkin_server_docker_name}:${image_tag}" "${pushkin_server}"
		log "done"
		;;
	"core")
		.pushkin/pushkin build api
		.pushkin/pushkin build cron
		.pushkin/pushkin build dbworker
		.pushkin/pushkin build server
		;;
	"quizzes")
		.pushkin/bin/buildQuizzes.sh "$@"
		;;
	"all")
		.pushkin/pushkin build api
		.pushkin/pushkin build cron
		.pushkin/pushkin build dbworker
		.pushkin/pushkin build server
		.pushkin/pushkin build quizzes
		;;
	*)
		die "build can build 'api', 'cron', 'dbworker', 'server', 'core', 'quizzes', or 'all'"
		;;
esac

if [ "$?" == 0 ]; then
	log "done"
else
	die "command failed"
fi
