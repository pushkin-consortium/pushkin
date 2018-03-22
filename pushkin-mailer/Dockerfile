FROM node:latest
RUN apt-get update
RUN apt-get install nano
RUN apt-get install -y netcat
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm install --production -s
CMD ["npm","start"]