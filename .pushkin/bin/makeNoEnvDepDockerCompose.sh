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

log () { echo "${boldFont}buildCoreDockers:${normalFont} ${1}"; }

env_file="${pushkin_env_file}"
dc_file="${pushkin_docker_compose_file}"
dc_noDep_file="${pushkin_docker_compose_noDep_file}"
set +e

##############################################
# start
##############################################

set -a
. "${env_file}"
set +a
cat "${dc_file}" | envsubst > "${dc_noDep_file}"
