FROM nginx
COPY ./build/ /var/www/html/
COPY dockerNginx.conf /etc/nginx/nginx.conf
COPY dockerStart.sh /etc/nginx/start.sh
WORKDIR /etc/nginx
ENTRYPOINT ["/bin/bash", "start.sh"]
