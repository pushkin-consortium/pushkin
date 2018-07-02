FROM nginx
MAINTAINER Robert Wilkinson
LABEL Name=games-with-words-nginx Version=0.0.1 
COPY ./html/ /var/www/html/
COPY nginx.conf /etc/nginx/nginx.conf
COPY start.sh /etc/nginx/start.sh
WORKDIR /etc/nginx
ENTRYPOINT ["/bin/bash", "start.sh"]
