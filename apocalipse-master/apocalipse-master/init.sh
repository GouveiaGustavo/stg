#!/bin/sh
adonis key:generate
adonis migration:run
adonis test
if [ $DOCKER_NODE_ENV = "staging" ] || [ $DOCKER_NODE_ENV = "development" ]
then
adonis serve --dev --debug
else
adonis serve
fi
exec "$@"