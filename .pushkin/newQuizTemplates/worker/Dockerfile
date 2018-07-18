FROM python:3-alpine
RUN apk update \
	&& apk add netcat-openbsd
  && apk add --virtual build-deps gcc python3-dev musl-dev \
  && apk add postgresql-dev \
  && pip install pika psycopg2 \
  && apk del build-deps

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app
CMD python worker.py
