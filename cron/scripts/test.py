#!/usr/bin/env python2.7

# python script which needs an environment variable and runs as a cron job
import datetime
import os

print "IN PYTHON"
print "Cron job has run at %s with environment variable '%s'" %(datetime.datetime.now(), os.environ)