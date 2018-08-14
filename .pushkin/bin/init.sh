#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='init'
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

set +e

##############################################
# start
##############################################

# .env file setup
cp .pushkin/dotEnvTemplate .env

# npm installs
npmInstall () {
	local origin="$(pwd)"
	cd "$1"
	if [ ! "$?" == 0 ]; then
		die "something went wrong. it appears core directories are missing"
	fi
	npm install
	cd "$origin"
}
npmInstall "${pushkin_api}"&
npmInstall "${pushkin_db_worker}"&
npmInstall "${pushkin_front_end}"&
wait

log "open '.env' in a text editor and fill in the necessary information to complete setup"
log "done"
