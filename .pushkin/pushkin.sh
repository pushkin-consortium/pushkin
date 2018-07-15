#!/bin/bash

##############################################
# setup
##############################################

die () { echo "${1}"; exit 1; }
dieCorrupt () { echo "Pushkin project directory is corrupt. Error: ${1}"; exit 2; }
checkPushkinNotCorrupt () {
	# assumes $1 is root path of pushkin
	# and .pushkin/ exists
	root="${1}"

	test_dirs=("${root}/.pushkin/bin")
	for dir in ${test_dirs[@]}; do
		if [ ! -d "${dir}" ]; then
			dieCorrupt "Missing critical infrastructure directory ${dir}"
		fi
	done

	test_files=("${root}/.pushkin/pushkin_config_vars.sh")
	for file in ${test_files[@]}; do
		if [ ! -f "${file}" ]; then
			dieCorrupt "Missing critical infrastructure file ${file}"
		fi
	done
}

##############################################
# start
##############################################

while [ ! -d "$PWD/.pushkin" ]; do
	if [ $PWD == '/' ]; then
		die "No pushkin project found here or in any above directories"
	fi
	cd ..
done
# will die with error if setup's innapropriate
checkPushkinNotCorrupt $PWD

# setup good enough to function (not an exhaustive check)
source '.pushkin/pushkin_config_vars.sh'
source '.pushkin/bin/core.sh'

log () { echo "${boldFont}pushkin:${normalFont} ${1}"; }

log "not yet implemented. should route subcommands to scripts in .pushkin/bin, passing in config directory as first argument"

sub_command="${1}"
shift
case "${sub_command}" in
	"prep")
		./bin/prepareFiles.sh "$@"
		;;
	*)
		die "command ${sub_command} does not exist"
		;;













