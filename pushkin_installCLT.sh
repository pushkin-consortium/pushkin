#!/bin/bash

# make sure /usr/local/bin exists
if [ ! -d "/usr/local/bin" ]; then
        mkdir /usr/local/bin
fi

[[ ":$PATH:" != *":/usr/local/bin:"* ]] && echo "$PATH:/usr/local/bin" >> ~/.bash_profile

cp .pushkin/pointer_pushkin /usr/local/bin/pushkin
cp .tools/pointer_tools /usr/local/bin/pushkin-tools
