FROM node:latest
RUN apt-get update && apt-get install -qy netcat
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN npm install
EXPOSE 8000
CMD ["npm","start"]
