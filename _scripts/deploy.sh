#!/bin/bash

# ==== Deploy ====
#Build and deploy everything for production / putting it online.

# Set the environment variable to production mode
env NODE_ENV=production


# --- Front-End ---
# Change into the front-end folder and build with the "publish" script
# the publish script also uploads
cd ./front-end/
npm run publish
# Change back into the pushkin folder and copy over all files ending in .ico, .html, .txt, .xml
# into the folder server/html/
cd ..
/bin/cp -R -f ./front-end/public/**.ico ./server/html
/bin/cp -R -f ./front-end/public/**.txt ./server/html
/bin/cp -R -f ./front-end/public/**.html ./server/html
/bin/cp -R -f ./front-end/public/**.xml ./server/html


# --- Docker ---
# Build all the images with docker
docker build --no-cache -t DOCKERHUB_USER/api:latest api
docker build --no-cache -t DOCKERHUB_USER/cron:latest cron
docker build --no-cache -t DOCKERHUB_USER/db-worker:latest db-worker
docker build --no-cache -t DOCKERHUB_USER/server:latest server
docker build --no-cache -t DOCKERHUB_USER/EXPERIMENT_NAME:latest workers/EXPERIMENT_NAME


# Upload /push the images to dockerhub
# they can be found at https://hub.docker.com/r/[IMAGE-NAME]
# e.g. https://hub.docker.com/r/cbainbridge/api
docker push DOCKERHUB_USER/api
docker push DOCKERHUB_USER/cron
docker push DOCKERHUB_USER/db-worker
docker push DOCKERHUB_USER/server
docker push DOCKERHUB_USER/EXPERIMENT_NAME


# --- After running this Script ---
# The images have then to be downloaded / pulled on the actual server
# at the moment this means updating them in Rancher, but this could
# take other forms in the future.

#Before doing this, make sure you have created a Rancher Environment API Key and Secret Key through the Rancher interface (to be replaced below; go to Rancher->API->Keys-> Advanced)

#ALSO, make sure you run 'pip3 install argparse requests'

# You still need to create the new experiment as a service on Rancher.

# Automatically upgrade ALL rancher containers
python3 ./_scripts/rancher-upgrade.py -n STACK_NAME -u "https://RANCHER_URL" -a RANCHER_ENVIRONMENT_KEY -k RANCHER_SECRET_KEY -s api
python3 ./_scripts/rancher-upgrade.py -n STACK_NAME -u "https://RANCHER_URL" -a RANCHER_ENVIRONMENT_KEY -k RANCHER_SECRET_KEY -s cron
python3 ./_scripts/rancher-upgrade.py -n STACK_NAME -u "https://RANCHER_URL" -a RANCHER_ENVIRONMENT_KEY -k RANCHER_SECRET_KEY -s db-worker
python3 ./_scripts/rancher-upgrade.py -n STACK_NAME -u "https://RANCHER_URL" -a RANCHER_ENVIRONMENT_KEY -k RANCHER_SECRET_KEY -s server
python3 ./_scripts/rancher-upgrade.py -n STACK_NAME -u "https://RANCHER_URL" -a RANCHER_ENVIRONMENT_KEY -k RANCHER_SECRET_KEY -s QUIZ_NAME
