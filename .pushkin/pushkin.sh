#!/bin/bash

# NB: all scripts in /bin expect to be run from pushkin root as the cwd

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

# move to root
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
makeRouter () {
	sub_sub="${1}"
	shift
	case "${sub_sub}" in
		"quiz")
			.pushkin/bin/newQuiz.sh "$@"
			;;
		"dockerCompose")
			.pushkin/bin/makeDockerCompose.sh "$@"
			;;
		*)
			die "can make 'quiz' or 'dockerCompose'"
			;;
	esac
}
buildRouter () {
	sub_sub="${1}"
	shift
	case "${sub_sub}" in
		"core")
			.pushkin/bin/buildCoreDockers.sh "$@"
			;;
		"quizzes")
			.pushkin/bin/buildQuizzes.sh "$@"
			;;
		"all")
			buildRouter core "$@"
			buildRouter quizzes "$@"
			;;
		*)
			die "build can build 'core', 'quizzes', or 'all'"
			;;
	esac
}
syncRouter () {
	sub_sub="${1}"
	shift
	case "${sub_sub}" in
		"coreDockers")
			.pushkin/bin/syncCoreDockers.sh "$@"
			;;
		"quizDockers")
			.pushkin/bin/syncQuizzes.sh "$@"
			;;
		"website")
			.pushkin/bin/syncWebsite.sh "$@"
			;;
		"all")
			syncRouter coreDockers "$@"
			syncRouter quizDockers "$@"
			syncRouter website "$@"
			;;
		*)
			die "sync can sync 'coreDockers', 'quizDockers', 'website', or 'all'"
			;;
	esac
}

# route commands
sub_command="${1}"
shift
case "${sub_command}" in
	"make")
		makeRouter "$@"
		;;
	"prep")
		.pushkin/bin/prepareFiles.sh "$@"
		;;
	"build")
		buildRouter "$@"
		;;
	"sync")
		syncRouter "$@"
		;;
	"compileFrontEnd")
		.pushkin/bin/compileFrontEnd.sh "$@"
		;;
	*)
		die "command ${sub_command} does not exist"
		;;
esac














