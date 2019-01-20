#!/bin/bash

echo "version:"
read version

echo "description:"
read description

zip -r pushkin.zip * .pushkin -x *.git*

git tag $version && git push --tags

gothub release \
    --user pushkin-consortium \
    --repo pushkin \
    --tag $version \
    --name $version \
    -d "$description"

gothub upload \
    --user pushkin-consortium \
    --repo pushkin \
    --tag $version \
    --name "pushkin" \
    --file pushkin.zip \
    --replace

rm pushkin.zip
