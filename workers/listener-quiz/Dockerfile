FROM stackbrew/debian:jessie
MAINTAINER Robert Wilkinson
RUN apt-get update
RUN apt-get install -qy netcat
RUN apt-get install -qy python
RUN apt-get install -qy python-pip
RUN pip install pika reload
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
CMD python worker.py
