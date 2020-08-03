# Troubleshooting Pushkin

### error: database "test\_db" does not exist

In cases where your database does not successfully get set up, it's possible that Postgres is clogging port 5432 on your computer. To check if this is the case run the following in Terminal/your command line: `sudo lsof -i tcp:5432`

If Postgres is running on port 5432, run the following to clear it: `sudo pkill -u postgres`

