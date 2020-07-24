FROM node:latest
COPY Dockerfile index.js package.json start.sh yarn.lock /usr/src/app/
WORKDIR /usr/src/app
RUN yarn install --production
RUN apt-get update && apt-get install -qy netcat
EXPOSE 8000
CMD ["bash","start.sh"]
