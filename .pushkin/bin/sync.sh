#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='sync'
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

toSync="${1}"
shift
case "${toSync}" in
	"core")
		.pushkin/bin/syncCoreDockers.sh "$@"
		;;
	"quizzes")
		.pushkin/bin/syncQuizzes.sh "$@"
		;;
	"website")
		.pushkin/bin/syncWebsite.sh "$@"
		;;
	"all")
		.pushkin/bin/sync.sh core
		.pushkin/bin/sync.sh quizzes
		.pushkin/bin/sync.sh website
		;;
	*)
		die "sync can sync 'core', 'quizzes', 'website', or 'all'"
		;;
esac

if [ "$?" == 0 ]; then
	log "done"
else
	die "command failed"
fi
