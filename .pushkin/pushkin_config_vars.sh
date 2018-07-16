# all paths are relative to project root

pushkin_env_file='.env'
pushkin_docker_compose_file='docker-compose.production.yml'
pushkin_docker_compose_noDep_file='docker-compose.production.noEnvDependency.yml'

# folder locations
# root houses the Dockerfile
pushkin_api='api'
pushkin_api_docker_name='pushkin_api'
pushkin_api_controllers="${pushkin_api}/controllers"

pushkin_cron='cron'
pushkin_cron_docker_name='pushkin_cron'
pushkin_cron_scripts="${pushkin_cron}/scripts"
pushkin_cron_tab="${pushkin_cron}/crontab"

pushkin_db_worker='db-worker'
pushkin_db_worker_docker_name='pushkin_db_worker'
pushkin_db_worker_migrations="${pushkin_db_worker}/migrations"
pushkin_db_worker_models="${pushkin_db_worker}/models"
pushkin_db_worker_seeds="${pushkin_db_worker}/seeds"

pushkin_front_end='front-end'
pushkin_front_end_docker_name='pushkin_front_end'
pushkin_front_end_dist="${pushkin_front_end}/dist"
pushkin_front_end_quizzes_dir="${pushkin_front_end}/src/quizzes"
pushkin_front_end_quizzes_list="${pushkin_front_end}/src/quizzes/quizzes.js"
# to run from front end directory
pushkin_front_end_compile_cmd='node compile.js'

pushkin_mailer='pushkin-mailer'
pushkin_mailer_docker_name='pushkin_mailer'

pushkin_user_quizzes='quizzes/quizzes'
pushkin_user_quizzes_docker_suffix='-pushkin-quiz'

pushkin_server='server'
pushkin_server_docker_name='pushkin_server'
pushkin_server_html="${pushkin_server}/html"

