# basic test to see if a folder in the $pushkin_user_quizzes directory is a quiz or not (after addition of library folder)

isQuiz () {
	status=""
	local qPath="${1}"
	if [ ! -d "${qPath}"/api_controller ]; then status+=" no api_controllers"; fi
	if [ ! -d "${qPath}"/db_migrations ]; then status+=" no db_migrations"; fi
	if [ ! -d "${qPath}"/db_models ]; then status+=" no db_models"; fi
	if [ ! -d "${qPath}"/quiz_page ]; then status+=" no quiz_page"; fi
# workers don't need to be copied
#	if [ ! -d "${qPath}"/worker ]; then status+=" no worker"; fi
	if [ ! -d "${qPath}"/db_seeds ]; then status+=" no db_seeds"; fi
	if [ ! -d "${qPath}"/cron_scripts ]; then status+=" no cron_scripts"; fi
	if [ "${status}" == "" ]; then return 0; fi
	# calling scripts are assumed to have initialized log with their scriptName
	log "${qPath} was not recognized as a quiz: ${status}"
	return 1;
}
