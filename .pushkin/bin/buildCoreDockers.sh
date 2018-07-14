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
##############################################
set -e

log () { echo "${boldFont}buildCoreDockers:${normalFont} ${1}"; }

coreDockers=()
coreDockerNames=()

coreDockers+=("$pushkin_api")
coreDockerNames+=("$pushkin_api_docker_name")

coreDockers+=("$pushkin_cron")
coreDockerNames+=("$pushkin_cron_docker_name")

coreDockers+=("$pushkin_db_worker")
coreDockerNames+=("$pushkin_db_worker_docker_name")

coreDockers+=("$pushkin_front_end")
coreDockerNames+=("$pushkin_front_end_docker_name")

# mailer not set up
#coreDockers+=("$pushkin_mailer")
#coreDockerNames+=("$pushkin_mailer_docker_name")

coreDockers+=("$pushkin_server")
coreDockerNames+=("$pushkin_server_docker_name")

set +e

##############################################
# start
##############################################

log "not yet implemented (see code in prepareToDeploy for reference)"






