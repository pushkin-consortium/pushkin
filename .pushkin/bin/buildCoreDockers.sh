#!/bin/bash

##############################################
# sources
##############################################

set -e
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}buildCoreDockers:${normalFont} ${1}"; }

source "${pushkin_env_file}"
docker_repo="${image_prefix}"
docker_tag="${image_tag}"
if [ ! -z "${docker_tag}" ]; then
	docker_tag=":${docker_tag}"
fi

set +e

##############################################
# start
##############################################

log "building api as '${pushkin_api_docker_name}'"
docker build -t "${docker_repo}/${pushkin_api_docker_name}${docker_tag}" "${pushkin_api}"

log "building cron as '${pushkin_cron_docker_name}'"
docker build -t "${docker_repo}/${pushkin_cron_docker_name}${docker_tag}" "${pushkin_cron}"

log "building db_worker as '${pushkin_db_worker_docker_name}'"
docker build -t "${docker_repo}/${pushkin_db_worker_docker_name}${docker_tag}" "${pushkin_db_worker}"

log "building front_end as '${pushkin_front_end_docker_name}'"
docker build -t "${docker_repo}/${pushkin_front_end_docker_name}${docker_tag}" "${pushkin_front_end}"

# mailer not yet set up
#log "building mailer as '${pushkin_mailer_docker_name}'"
#docker build -t "${docker_repo}/${pushkin_mailer_docker_name}${docker_tag}" "${pushkin_mailer}"

log "building server as '${pushkin_server_docker_name}'"
docker build -t "${docker_repo}/${pushkin_server_docker_name}${docker_tag}" "${pushkin_server}"

log "done"
