#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='syncCoreDockers'
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

set +e

##############################################
# start
##############################################

log "syncing docker api as '${pushkin_api_docker_name}'"
docker push "${docker_repo}/${pushkin_api_docker_name}${docker_tag}"

log "syncing docker cron as '${pushkin_cron_docker_name}'"
docker push "${docker_repo}/${pushkin_cron_docker_name}${docker_tag}"

log "syncing docker db_worker as '${pushkin_db_worker_docker_name}'"
docker push "${docker_repo}/${pushkin_db_worker_docker_name}${docker_tag}"

log "syncing docker front_end as '${pushkin_front_end_docker_name}'"
docker push "${docker_repo}/${pushkin_front_end_docker_name}${docker_tag}"

# mailer not yet set up
#log "syncing docker mailer as '${pushkin_mailer_docker_name}'"
#docker push "${docker_repo}/${pushkin_mailer_docker_name}${docker_tag}"

log "syncing docker server as '${pushkin_server_docker_name}'"
docker push "${docker_repo}/${pushkin_server_docker_name}${docker_tag}"


log "done"
