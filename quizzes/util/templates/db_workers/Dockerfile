FROM stackbrew/debian:jessie
MAINTAINER Robert Wilkinson
RUN apt-get update && apt-get install -qy netcat \
			python \
			python-pip
RUN pip install pika psycopg2 reload
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
CMD python worker.py
