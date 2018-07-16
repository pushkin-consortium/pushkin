#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='specify quiz name!'
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
#source "${pushkin_env_file}"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; }
die () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; exit 1; }

comp_command="${pushkin_front_end_compile_cmd}"
front_end="${pushkin_front_end}"

set +e

##############################################
# start
##############################################

cd "${front_end}"
$comp_command

log "done"
