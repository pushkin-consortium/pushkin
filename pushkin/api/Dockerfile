FROM node:20.2

COPY ./src /usr/src/app/src
COPY .yalc /usr/src/app/.yalc/
COPY ./package.json ./yarn.lock ./.babelrc ./yalc.lock ./dockerStart.sh /usr/src/app/

WORKDIR /usr/src/app
RUN yarn install
RUN yarn build

RUN apt-get update && apt-get install -y netcat
CMD ["bash", "dockerStart.sh"]