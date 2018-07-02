# Quizzes

This folder is the only location where users of the Pushkin platform need to put their own experiment-specific files; the rest of the files can remain unmodified (excluding docker's environment (.env) file, which contains passwords and login info for various services).

Each quiz should have its own folder inside the quizzes folder in this folder. Inside each quiz, there should be folders for:

- API controller (`api_controllers`)
- Cron scripts (`cron_scripts`)
- DB Models (`db_models`)
- DB Migrations (`db_migrations`)
- DB Seeds (`db_seeds`)
- Quiz pages (`quiz_page`)

Setting up a new quiz can be automated slightly with the newQuiz.sh script in the util folder.