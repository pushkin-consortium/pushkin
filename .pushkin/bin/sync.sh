#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='sync'
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

toSync="${1}"
shift
case "${toSync}" in
	"api")
		log "syncing docker api as '${pushkin_api_docker_name}'"
		docker push "${image_prefix}/${pushkin_api_docker_name}${image_tag}"
		;;
	"cron")
		log "syncing docker cron as '${pushkin_cron_docker_name}'"
		docker push "${image_prefix}/${pushkin_cron_docker_name}${image_tag}"
		;;
	"dbworker")
		log "syncing docker db_worker as '${pushkin_db_worker_docker_name}'"
		docker push "${image_prefix}/${pushkin_db_worker_docker_name}${image_tag}"
		;;
	"server")
		log "syncing docker server as '${pushkin_server_docker_name}'"
		docker push "${image_prefix}/${pushkin_server_docker_name}${image_tag}"
		;;
	"quizzes")
		.pushkin/bin/syncQuizzes.sh "$@"
		;;
	"website")
		.pushkin/bin/syncWebsite.sh "$@"
		;;
	"core")
		.pushkin/bin/sync.sh api
		.pushkin/bin/sync.sh cron
		.pushkin/bin/sync.sh dbworker
		.pushkin/bin/sync.sh server
		;;
	"all")
		.pushkin/bin/sync.sh core
		.pushkin/bin/sync.sh quizzes
		.pushkin/bin/sync.sh website
		;;
	*)
		die "sync can sync 'api', 'server', 'dbworker', 'cron', 'core', 'quizzes', 'website', or 'all'"
		;;
esac

if [ "$?" == 0 ]; then
	log "done"
else
	die "command failed"
fi
