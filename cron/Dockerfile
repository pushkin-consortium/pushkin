FROM ubuntu:latest

MAINTAINER Robert Wilkinson
LABEL Name=games-with-words-cron Version=0.0.1 

RUN apt-get update && apt-get -qq update && apt-get install -y nodejs cron python2.7
# TODO could uninstall some build dependencies

RUN update-alternatives --install /usr/bin/node node /usr/bin/nodejs 10
RUN update-alternatives --install /usr/bin/python python /usr/bin/python2.7 10

COPY cron.sh /usr/bin/cron.sh
COPY ./crontab /etc/cron.d/cron-jobs
COPY ./scripts /scripts/

RUN chmod +x /usr/bin/cron.sh
RUN chmod 0644 /etc/cron.d/cron-jobs
RUN chmod 0644 /scripts/*
RUN chmod +x /scripts/*

RUN chmod 777 /scripts/*

RUN touch /var/log/cron.log

ENTRYPOINT ["/bin/sh", "/usr/bin/cron.sh"]
