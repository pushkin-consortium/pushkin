#!/bin/bash

##############################################
# sources
##############################################

set -e
scriptName='newQuiz'
pushkin_conf_dir="$PWD"/.pushkin

source "${pushkin_conf_dir}/pushkin_config_vars.sh"
source "${pushkin_conf_dir}/bin/core.sh"
source "${pushkin_conf_dir}/bin/util/isQuiz.sh"
set +e

##############################################
# variables
# WORKING DIR: pushkin root
##############################################
set -e

log () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; }
die () { echo "${boldFont}${scriptName}:${normalFont} ${1}"; exit 1; }

user_quizzes="${pushkin_user_quizzes}"
templates=".pushkin/newQuizTemplates"

if [ ! -z "${1}" ]; then
	qname=$(echo "${1}" | tr '[:upper:]' '[:lower:]')
	if [ -d "${user_quizzes}"/"${qname}" ]; then
		die "A quiz named '${qname}' already exists."
	fi
else
	die "not a valid quiz name"
fi

set +e

##############################################
# start
##############################################

set -e
# set -v

replaceQuizName () {
	local file="${1}"
	local quizName="${2}"
	sed -e "s/\${QUIZ_NAME}/${quizName}/" "${file}"
}
recurseReplace () {
	local outRoot="${1}"
	local cur="${2}"
	local quizName="${3}"
	for thing in "${cur}"/*; do
		local base=$(basename "${thing}")
		if [ -f "${thing}" ]; then
			local newBase=$(echo "${base}" | sed -e "s/QUIZNAME/${quizName}/g")
			replaceQuizName "${thing}" "${quizName}" > "${outRoot}/${newBase}"

		elif [ -d "${thing}" ]; then

			# for testing purposes only
			# once the worker works we should remove node modules entirely
			# and use prepareFiles to install the dependencies in the front-end
			# package or wherever else they're needed
			if [ "${base}" == "node_modules" ]; then continue; fi # special case

			# normal case/otherwise:
			mkdir "${outRoot}/${base}"
			recurseReplace "${outRoot}/${base}" "${thing}" "${qname}"
		else
			log "${thing} is not a file or folder, ignoring"
		fi
	done
}

mkdir "${user_quizzes}/${qname}"
recurseReplace "${user_quizzes}/${qname}" "${templates}" "${qname}"

# quick test
if ! isQuiz "${user_quizzes}/${qname}"; then
	die "ERROR: Failed to build quiz. Did not detect quiz at build location after build attempt. Something is either wrong with newQuiz.sh, isQuiz.sh, or Pushkin's permissions are wrong." 
fi

log "done"
