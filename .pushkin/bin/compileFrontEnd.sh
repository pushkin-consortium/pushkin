#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='compileFrontEnd'
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
dist="${pushkin_front_end_dist}"
server_html="${pushkin_server_html}"

set +e

##############################################
# start
##############################################

log "compiling front end"
old_pwd="$PWD"
cd "${front_end}"
$comp_command
if [ $?	-ne 0 ]; then
	die "failed to compile, not copying"
fi

cd "$old_pwd"

log "moving compiled files (${dist} -> ${server_html})"
mkdir -p ${server_html}
cp -r ${dist}/* ${server_html}

log "done"
