FROM node:10.23.1-alpine
RUN apk add --no-cache tzdata \
    && ln -fs /usr/share/zoneinfo/America/Sao_Paulo /etc/localtime
# To handle 'not get uid/gid'
RUN npm config set unsafe-perm true
RUN npm i -g snyk@1.1064.0 @adonisjs/cli nodemon
RUN mkdir -p /var/www/apocalipse
WORKDIR /var/www/apocalipse
COPY ["package.json", "./"]
RUN npm install --staging --silent && npm install mysql --save && npm install sqlite3 --save && mv node_modules ../
RUN ln -s ../node_modules .
COPY . .
ADD init.sh /init.sh
RUN chmod +x /init.sh
ENTRYPOINT ["/init.sh"]
