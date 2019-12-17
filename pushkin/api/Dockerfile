FROM node:latest
RUN apt-get update && apt-get install -y netcat
COPY ./build /usr/src/app/build
COPY ./tempPackages /usr/src/app/tempPackages
COPY ./package.json /usr/src/app
COPY ./dockerStart.sh /usr/src/app
WORKDIR /usr/src/app
RUN npm install --production
CMD ["bash", "dockerStart.sh"]
