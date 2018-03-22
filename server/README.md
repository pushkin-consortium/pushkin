# Pushkin-server

http://i.imgur.com/ncRJMJ5.png

# Overview

Pushkin server is a webserver that has 2 parts

1. A proxy pass that redirects all requests to `/api` to the json api, could easily scale to multiple api upstreams depending on the traffic.
2. It serves static html and favicon files
# Core Features
- all files in `html/` are served up by [NGINX](https://nginx.org/en/docs/)
- the `nginx.conf` has a section to redirect views to a separate page, this is in case you want to incrementally add pushkin to your site.
- in production, simply set up a load balancer on the main ip for any request on `api` , balance that over any number of  `pushkin-api` docker containers
# Get started

We recommend you use `pushkin-react` with your AWS setup properly and deploy your js/css assets to a CDN, but you can also dump them in the html folder in this repo.

If you do go the `pushkin-react` route, copy all the `.ico` `.txt.` `.html` and `.xml` files in the `pushkin-react/public` folder into the html folder in this repo
This small script is an example of how to do it:

    cp -rf pushkin-react/public/**.ico pushkin-server/html &&
    cp -rf pushkin-react/public/**.txt pushkin-server/html &&
    cp -rf pushkin-react/public/**.html pushkin-server/html &&
    cp -rf pushkin-react/public/**.xml pushkin-server/html 

There is a section in the Dockerfile that is specific to Boston Colleges needs, but can be usefull when you want to incrementally adopt pushkin, esp in a PHP environment:

      location ~ (\.php$|/JapanesePronouns|/Sliktopoz|/Hartshorne|/SpryAssets|/MRQ|/IgnoreThat|/VocabQuiz|/TrialsoftheHeart|/images|/global.css|/people|/funding|/media|/links|/contact|/Scripts|/Resources|/VerbCorner|/ThatKindofPerson|/exparchive.html) {
      
        resolver 8.8.8.8;
        proxy_pass http://www.gameswithwords.org/$uri;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
      }

This simply redirects any request to those urls to the original site.

The Dockerfile is super simple, feel free to tweak to make it fit your needs. 

# Extension
- Automate the deploy process by writing shell scripts to handle some of the copy and pasting
- add in your own upstreams to get access to multiple different services services.

