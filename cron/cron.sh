#!/usr/bin/env bash

printenv | cat - /etc/cron.d/cron-jobs > ~/crontab.tmp \
    && mv ~/crontab.tmp /etc/cron.d/cron-jobs

chmod 644 /etc/cron.d/cron-jobs

tail -f /var/log/cron.log &

cron -f