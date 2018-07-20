# basic test to see if a folder in the $pushkin_user_quizzes directory is a quiz or not (after addition of library folder)
isQuiz () {
	status=""
	local qPath="${1}"
	if [ ! -d "${qPath}"/api_controllers ]; then status+="no api_controllers"; return 1; fi
	if [ ! -d "${qPath}"/db_migrations ]; then status+="no db_migrations"; return 1; fi
	if [ ! -d "${qPath}"/db_models ]; then status+="no db_models"; return 1; fi
	if [ ! -d "${qPath}"/quiz_page ]; then status+="no quiz_page"; return 1; fi
	if [ ! -d "${qPath}"/worker ]; then status+="no worker"; return 1; fi
	if [ ! -d "${qPath}"/db_seeds ]; then status+="no db_seeds"; return 1; fi
	if [ ! -d "${qPath}"/cron_scripts ]; then status+="no cron_scripts"; return 1; fi
	return 0;
}
