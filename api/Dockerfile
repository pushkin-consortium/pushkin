FROM node:latest
RUN apt-get update && apt-get install -y netcat
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm install --production -s
# Note that the docker compose file overrides this to start.sh instead
CMD ["npm","start"]
