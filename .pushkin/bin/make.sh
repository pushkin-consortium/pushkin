#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='make'
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

toMake="${1}"
shift
case "${toMake}" in
	"quiz")
		.pushkin/bin/newQuiz.sh "$@"
		;;
	"compose")
		.pushkin/bin/makeDockerCompose.sh "$@"
		;;
	*)
		die "can make 'quiz' or 'compose'"
		;;
esac

if [ "$?" == 0 ]; then
	log "done"
else
	die "command failed"
fi
