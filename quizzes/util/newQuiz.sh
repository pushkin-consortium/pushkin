# Run from util directory
set -e
cd ../util/../quizzes/

read -p 'Quiz name: ' qname

if [ -d "${qname}" ]; then
	echo "A quiz named '${qname}' already exists."
	exit
fi

mkdir "${qname}"
cd "${qname}"
FOLDERS=('api_controllers' 'cron_scripts' 'db_models' 'db_migrations' 'db_seeds' 'quiz_page' 'db_workers')
for i in "${FOLDERS[@]}"; do mkdir "$i"; done
cd ..

#### add default starting files (names are used by prepareToDeploy.sh!) #####

# db workers
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_workers/docker_compose_appendage.yml > "./${qname}/db_workers/docker_compose_appendage.yml"
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_workers/start.sh > "./${qname}/db_workers/start.sh"
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_workers/worker.py > "./${qname}/db_workers/workey.py"
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_workers/handleResponse.py > "./${qname}/db_workers/handleResponse.py"
cp ../util/templates/db_workers/Dockerfile "./${qname}/db_workers/Dockerfile"

# api controller
cp ../util/templates/api_controller/api_controller.js "./${qname}/api_controllers/${qname}.js"

# db models
cp -r ../util/templates/db_models/* "./${qname}/db_models/"

# db migrations
# NB: The order of these migrations matters (the timestamps must be consecutive in the following order because of relational dependencies)
# changing will cause knex migrations to fail
timestamp () { date +"%Y%m%d%H%M%S"; sleep 1; }
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_migrations/TIMESTAMP_create_QUIZNAME_stimuli.js > "./${qname}/db_migrations/$(timestamp)_create_${qname}_stimuli.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_migrations/TIMESTAMP_create_QUIZNAME_users.js > "./${qname}/db_migrations/$(timestamp)_create_${qname}_users.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_migrations/TIMESTAMP_create_QUIZNAME_stimulusResponses.js > "./${qname}/db_migrations/$(timestamp)_create_${qname}_stimulusResponses.js"

sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/db_migrations/TIMESTAMP_create_QUIZNAME_responses.js > "./${qname}/db_migrations/$(timestamp)_create_${qname}_responses.js"

# cron
echo '# contents of this file auto-appended to cron/crontab during build' > "${qname}/cron_scripts/crontab.txt"
echo "* 0 0 0 0 root /scripts/${qname}/exampleCron.py" >> "${qname}/cron_scripts/crontab.txt"
mkdir -p "${qname}/cron_scripts/scripts/${qname}/"
touch "${qname}/cron_scripts/scripts/${qname}/exampleCron.py"

# quiz page
sed -e "s/\${QUIZ_NAME}/${qname}/" ../util/templates/quiz_page/index.js > "./${qname}/quiz_page/index.js"
cp ../util/templates/quiz_page/styles.scss "./${qname}/quiz_page/"
