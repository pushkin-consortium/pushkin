# Troubleshooting Pushkin

### error: database "test\_db" does not exist

In cases where your database does not successfully get set up, it's possible that Postgres is clogging port 5432 on your computer. To check if this is the case run the following in Terminal/your command line: `sudo lsof -i tcp:5432`

If Postgres is running on port 5432, run the following to clear it: `sudo pkill -u postgres`

### Cannot start service server: Ports are not available: listen tcp 0.0.0.0:80: bind: address already in use

You must have Port 80 open to run your Pushkin site locally, so make sure you aren't running any other web servers there before running `pushkin prep`. If you encounter this error, you can find what is clogging your Port 80 using the command: `lsof -i tcp:80`.
![](../.gitbook/assets/ls_output.png)


Then to clear the port, run the following (replacing `<PID>` with the PID(s) listed from the lsof command above): `kill -9 <PID>`

### homebrew install not working

Homebrew is not compatible with some shells such as tcsh, try using bash or xsh instead.
