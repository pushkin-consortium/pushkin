FROM node:latest
RUN apt-get update && apt-get install -y netcat
COPY . /usr/src/app
WORKDIR /usr/src/app
CMD npm run build
CMD npm start