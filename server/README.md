# Pushkin-server

# Overview

Pushkin server is a webserver that has 2 parts:

1. A proxy pass that redirects all requests to `/api` to the json api, could easily scale to multiple api upstreams depending on the traffic.
2. It serves static html and favicon files.
# Core Features
- All files in `html/` are served up by [NGINX](https://nginx.org/en/docs/)
- The `nginx.conf` has a section to redirect views to a separate page, this is in case you want to incrementally add Pushkin to your site.
- In production, simply set up a load balancer on the main ip for any request on `api`and balance that over any number of  `pushkin-api` docker containers
# Get started

We recommend you use `pushkin-react` with your AWS setup properly and deploy your js/css assets to a CDN, but you can also dump them in the html folder in this repo.

If you do go the `pushkin-react` route, copy all the `.ico` `.txt.` `.html` and `.xml` files in the `front-end/dist` folder into the html folder in this repo.

The Dockerfile is super simple, feel free to tweak to make it fit your needs. 

# Extension
- add in your own upstreams to get access to multiple different services services.

