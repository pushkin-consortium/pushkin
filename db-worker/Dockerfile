FROM node:latest
RUN apt-get update && apt-get install nano && apt-get install -y netcat
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm install --production -s
CMD ["npm","start"]
