FROM node:latest
RUN apt-get update
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm install
CMD ["npm","start"]