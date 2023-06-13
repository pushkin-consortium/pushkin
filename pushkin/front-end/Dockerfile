FROM node:20.2

COPY ./public /usr/src/app/public
COPY ./src /usr/src/app/src
COPY .yalc /usr/src/app/.yalc/
COPY ./experiments.js /usr/src/app/src/
COPY ./package.json ./yarn.lock ./yalc.lock ./craco.config.js /usr/src/app/

WORKDIR /usr/src/app
RUN yarn install
RUN apt-get update && apt-get install -y netcat

CMD yarn start