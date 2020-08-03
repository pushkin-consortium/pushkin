---
description: Example output for `pushkin start;`
---

```text
Pulling message-queue (rabbitmq:3.6-management)...
3.6-management: Pulling from library/rabbitmq
Digest: sha256:05bd722c6b0c747ae7f854baa9e9ceb9b47da75e39f93ad6a1db74f788b0f828
Status: Downloaded newer image for rabbitmq:3.6-management
Building api
Step 1/9 : FROM node:latest
 ---> 4495f296c63b
Step 2/9 : COPY ./src /usr/src/app/src
 ---> 97de4b6f2329
Step 3/9 : COPY .yalc /usr/src/app/.yalc/
 ---> 2d458b4765b5
Step 4/9 : COPY ./package.json ./yarn.lock ./.babelrc ./yalc.lock ./dockerStart.sh /usr/src/app/
 ---> 08066f98d19a
Step 5/9 : WORKDIR /usr/src/app
 ---> Running in 441c977fa797
Removing intermediate container 441c977fa797
 ---> 3bbe12015256
Step 6/9 : RUN yarn install
 ---> Running in f4a24c61033d
yarn install v1.22.4
[1/4] Resolving packages...
[2/4] Fetching packages...
info fsevents@1.2.13: The platform "linux" is incompatible with this module.
info "fsevents@1.2.13" is an optional dependency and failed compatibility check. Excluding it from installation.
[3/4] Linking dependencies...
[4/4] Building fresh packages...
Done in 13.42s.
Removing intermediate container f4a24c61033d
 ---> b3c6633ae326
Step 7/9 : RUN yarn build
 ---> Running in 4e789ea668f8
yarn run v1.22.4
$ rm -rf build/* && babel src -d build && cp src/controllers.json build/
Successfully compiled 1 file with Babel (551ms).
Done in 0.89s.
Removing intermediate container 4e789ea668f8
 ---> 7fdf9e401662
Step 8/9 : RUN apt-get update && apt-get install -y netcat
 ---> Running in 829498b20e05
Get:1 http://security.debian.org/debian-security stretch/updates InRelease [53.0 kB]
Ign:2 http://deb.debian.org/debian stretch InRelease
Get:3 http://deb.debian.org/debian stretch-updates InRelease [93.6 kB]
Get:4 http://deb.debian.org/debian stretch Release [118 kB]
Get:5 http://security.debian.org/debian-security stretch/updates/main amd64 Packages [542 kB]
Get:6 http://deb.debian.org/debian stretch Release.gpg [2410 B]
Get:7 http://deb.debian.org/debian stretch-updates/main amd64 Packages [2596 B]
Get:8 http://deb.debian.org/debian stretch/main amd64 Packages [7080 kB]
Fetched 7891 kB in 2s (2643 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  netcat-traditional
The following NEW packages will be installed:
  netcat netcat-traditional
0 upgraded, 2 newly installed, 0 to remove and 18 not upgraded.
Need to get 76.0 kB of archives.
After this operation, 173 kB of additional disk space will be used.
Get:1 http://deb.debian.org/debian stretch/main amd64 netcat-traditional amd64 1.10-41+b1 [67.0 kB]
Get:2 http://deb.debian.org/debian stretch/main amd64 netcat all 1.10-41 [8962 B]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 76.0 kB in 0s (474 kB/s)
Selecting previously unselected package netcat-traditional.
(Reading database ... 29937 files and directories currently installed.)
Preparing to unpack .../netcat-traditional_1.10-41+b1_amd64.deb ...
Unpacking netcat-traditional (1.10-41+b1) ...
Selecting previously unselected package netcat.
Preparing to unpack .../netcat_1.10-41_all.deb ...
Unpacking netcat (1.10-41) ...
Setting up netcat-traditional (1.10-41+b1) ...
update-alternatives: using /bin/nc.traditional to provide /bin/nc (nc) in auto mode
Setting up netcat (1.10-41) ...
Removing intermediate container 829498b20e05
 ---> 54fa1e297040
Step 9/9 : CMD ["bash", "dockerStart.sh"]
 ---> Running in dd663aea5237
Removing intermediate container dd663aea5237
 ---> 4d85628ad923
Successfully built 4d85628ad923
Successfully tagged pushkin_api:latest
Building server
Step 1/10 : FROM node:latest
 ---> 4495f296c63b
Step 2/10 : COPY ./public /usr/src/app/public
 ---> 6ab6701b2bb1
Step 3/10 : COPY ./src /usr/src/app/src
 ---> 9a51d2470254
Step 4/10 : COPY .yalc /usr/src/app/.yalc/
 ---> aa87afaa3fd0
Step 5/10 : COPY ./experiments.js /usr/src/app/src/
 ---> 4bce4d5786ca
Step 6/10 : COPY ./package.json ./yarn.lock ./yalc.lock /usr/src/app/
 ---> dbdf502c1f0d
Step 7/10 : WORKDIR /usr/src/app
 ---> Running in e7522226cc73
Removing intermediate container e7522226cc73
 ---> 17e630e2ea5c
Step 8/10 : RUN yarn install
 ---> Running in 0fa50e61707c
yarn install v1.22.4
[1/4] Resolving packages...
[2/4] Fetching packages...
info fsevents@2.1.2: The platform "linux" is incompatible with this module.
info "fsevents@2.1.2" is an optional dependency and failed compatibility check. Excluding it from installation.
info fsevents@1.2.13: The platform "linux" is incompatible with this module.
info "fsevents@1.2.13" is an optional dependency and failed compatibility check. Excluding it from installation.
info fsevents@2.1.3: The platform "linux" is incompatible with this module.
info "fsevents@2.1.3" is an optional dependency and failed compatibility check. Excluding it from installation.
[3/4] Linking dependencies...
warning " > bootstrap@4.5.0" has unmet peer dependency "jquery@1.9.1 - 3".
warning " > bootstrap@4.5.0" has unmet peer dependency "popper.js@^1.16.0".
warning " > styled-components@5.1.1" has unmet peer dependency "react-is@>= 16.8.0".
[4/4] Building fresh packages...
Done in 64.21s.
Removing intermediate container 0fa50e61707c
 ---> 9f512bdde32b
Step 9/10 : RUN apt-get update && apt-get install -y netcat
 ---> Running in c1953ca4dace
Get:1 http://security.debian.org/debian-security stretch/updates InRelease [53.0 kB]
Ign:2 http://deb.debian.org/debian stretch InRelease
Get:3 http://deb.debian.org/debian stretch-updates InRelease [93.6 kB]
Get:4 http://deb.debian.org/debian stretch Release [118 kB]
Get:5 http://security.debian.org/debian-security stretch/updates/main amd64 Packages [542 kB]
Get:6 http://deb.debian.org/debian stretch Release.gpg [2410 B]
Get:7 http://deb.debian.org/debian stretch-updates/main amd64 Packages [2596 B]
Get:8 http://deb.debian.org/debian stretch/main amd64 Packages [7080 kB]
Fetched 7891 kB in 2s (2780 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  netcat-traditional
The following NEW packages will be installed:
  netcat netcat-traditional
0 upgraded, 2 newly installed, 0 to remove and 18 not upgraded.
Need to get 76.0 kB of archives.
After this operation, 173 kB of additional disk space will be used.
Get:1 http://deb.debian.org/debian stretch/main amd64 netcat-traditional amd64 1.10-41+b1 [67.0 kB]
Get:2 http://deb.debian.org/debian stretch/main amd64 netcat all 1.10-41 [8962 B]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 76.0 kB in 0s (512 kB/s)
Selecting previously unselected package netcat-traditional.
(Reading database ... 29937 files and directories currently installed.)
Preparing to unpack .../netcat-traditional_1.10-41+b1_amd64.deb ...
Unpacking netcat-traditional (1.10-41+b1) ...
Selecting previously unselected package netcat.
Preparing to unpack .../netcat_1.10-41_all.deb ...
Unpacking netcat (1.10-41) ...
Setting up netcat-traditional (1.10-41+b1) ...
update-alternatives: using /bin/nc.traditional to provide /bin/nc (nc) in auto mode
Setting up netcat (1.10-41) ...
Removing intermediate container c1953ca4dace
 ---> a71f280d4de8
Step 10/10 : CMD yarn start
 ---> Running in cd0abf2c0d1c
Removing intermediate container cd0abf2c0d1c
 ---> 486d4e9e9e6d
Successfully built 486d4e9e9e6d
Successfully tagged pushkin_server:latest
Starting pushkin_test_db_1       ... done
Creating pushkin_message-queue_1 ... done
Creating pushkin_vocab_worker_1  ... done
Creating pushkin_api_1           ... done
Creating pushkin_server_1        ... done
3.6-management: Pulling from library/rabbitmq
Digest: sha256:05bd722c6b0c747ae7f854baa9e9ceb9b47da75e39f93ad6a1db74f788b0f828
Status: Downloaded newer image for rabbitmq:3.6-management
Step 1/9 : FROM node:latest
 ---> 4495f296c63b
Step 2/9 : COPY ./src /usr/src/app/src
 ---> 97de4b6f2329
Step 3/9 : COPY .yalc /usr/src/app/.yalc/
 ---> 2d458b4765b5
Step 4/9 : COPY ./package.json ./yarn.lock ./.babelrc ./yalc.lock ./dockerStart.sh /usr/src/app/
 ---> 08066f98d19a
Step 5/9 : WORKDIR /usr/src/app
 ---> Running in 441c977fa797
Removing intermediate container 441c977fa797
 ---> 3bbe12015256
Step 6/9 : RUN yarn install
 ---> Running in f4a24c61033d
yarn install v1.22.4
[1/4] Resolving packages...
[2/4] Fetching packages...
info fsevents@1.2.13: The platform "linux" is incompatible with this module.
info "fsevents@1.2.13" is an optional dependency and failed compatibility check. Excluding it from installation.
[3/4] Linking dependencies...
[4/4] Building fresh packages...
Done in 13.42s.
Removing intermediate container f4a24c61033d
 ---> b3c6633ae326
Step 7/9 : RUN yarn build
 ---> Running in 4e789ea668f8
yarn run v1.22.4
$ rm -rf build/* && babel src -d build && cp src/controllers.json build/
Successfully compiled 1 file with Babel (551ms).
Done in 0.89s.
Removing intermediate container 4e789ea668f8
 ---> 7fdf9e401662
Step 8/9 : RUN apt-get update && apt-get install -y netcat
 ---> Running in 829498b20e05
Get:1 http://security.debian.org/debian-security stretch/updates InRelease [53.0 kB]
Ign:2 http://deb.debian.org/debian stretch InRelease
Get:3 http://deb.debian.org/debian stretch-updates InRelease [93.6 kB]
Get:4 http://deb.debian.org/debian stretch Release [118 kB]
Get:5 http://security.debian.org/debian-security stretch/updates/main amd64 Packages [542 kB]
Get:6 http://deb.debian.org/debian stretch Release.gpg [2410 B]
Get:7 http://deb.debian.org/debian stretch-updates/main amd64 Packages [2596 B]
Get:8 http://deb.debian.org/debian stretch/main amd64 Packages [7080 kB]
Fetched 7891 kB in 2s (2643 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  netcat-traditional
The following NEW packages will be installed:
  netcat netcat-traditional
0 upgraded, 2 newly installed, 0 to remove and 18 not upgraded.
Need to get 76.0 kB of archives.
After this operation, 173 kB of additional disk space will be used.
Get:1 http://deb.debian.org/debian stretch/main amd64 netcat-traditional amd64 1.10-41+b1 [67.0 kB]
Get:2 http://deb.debian.org/debian stretch/main amd64 netcat all 1.10-41 [8962 B]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 76.0 kB in 0s (474 kB/s)
Selecting previously unselected package netcat-traditional.
(Reading database ... 29937 files and directories currently installed.)
Preparing to unpack .../netcat-traditional_1.10-41+b1_amd64.deb ...
Unpacking netcat-traditional (1.10-41+b1) ...
Selecting previously unselected package netcat.
Preparing to unpack .../netcat_1.10-41_all.deb ...
Unpacking netcat (1.10-41) ...
Setting up netcat-traditional (1.10-41+b1) ...
update-alternatives: using /bin/nc.traditional to provide /bin/nc (nc) in auto mode
Setting up netcat (1.10-41) ...
Removing intermediate container 829498b20e05
 ---> 54fa1e297040
Step 9/9 : CMD ["bash", "dockerStart.sh"]
 ---> Running in dd663aea5237
Removing intermediate container dd663aea5237
 ---> 4d85628ad923
Successfully built 4d85628ad923
Successfully tagged pushkin_api:latest
Step 1/10 : FROM node:latest
 ---> 4495f296c63b
Step 2/10 : COPY ./public /usr/src/app/public
 ---> 6ab6701b2bb1
Step 3/10 : COPY ./src /usr/src/app/src
 ---> 9a51d2470254
Step 4/10 : COPY .yalc /usr/src/app/.yalc/
 ---> aa87afaa3fd0
Step 5/10 : COPY ./experiments.js /usr/src/app/src/
 ---> 4bce4d5786ca
Step 6/10 : COPY ./package.json ./yarn.lock ./yalc.lock /usr/src/app/
 ---> dbdf502c1f0d
Step 7/10 : WORKDIR /usr/src/app
 ---> Running in e7522226cc73
Removing intermediate container e7522226cc73
 ---> 17e630e2ea5c
Step 8/10 : RUN yarn install
 ---> Running in 0fa50e61707c
yarn install v1.22.4
[1/4] Resolving packages...
[2/4] Fetching packages...
info fsevents@2.1.2: The platform "linux" is incompatible with this module.
info "fsevents@2.1.2" is an optional dependency and failed compatibility check. Excluding it from installation.
info fsevents@1.2.13: The platform "linux" is incompatible with this module.
info "fsevents@1.2.13" is an optional dependency and failed compatibility check. Excluding it from installation.
info fsevents@2.1.3: The platform "linux" is incompatible with this module.
info "fsevents@2.1.3" is an optional dependency and failed compatibility check. Excluding it from installation.
[3/4] Linking dependencies...
warning " > bootstrap@4.5.0" has unmet peer dependency "jquery@1.9.1 - 3".
warning " > bootstrap@4.5.0" has unmet peer dependency "popper.js@^1.16.0".
warning " > styled-components@5.1.1" has unmet peer dependency "react-is@>= 16.8.0".
[4/4] Building fresh packages...
Done in 64.21s.
Removing intermediate container 0fa50e61707c
 ---> 9f512bdde32b
Step 9/10 : RUN apt-get update && apt-get install -y netcat
 ---> Running in c1953ca4dace
Get:1 http://security.debian.org/debian-security stretch/updates InRelease [53.0 kB]
Ign:2 http://deb.debian.org/debian stretch InRelease
Get:3 http://deb.debian.org/debian stretch-updates InRelease [93.6 kB]
Get:4 http://deb.debian.org/debian stretch Release [118 kB]
Get:5 http://security.debian.org/debian-security stretch/updates/main amd64 Packages [542 kB]
Get:6 http://deb.debian.org/debian stretch Release.gpg [2410 B]
Get:7 http://deb.debian.org/debian stretch-updates/main amd64 Packages [2596 B]
Get:8 http://deb.debian.org/debian stretch/main amd64 Packages [7080 kB]
Fetched 7891 kB in 2s (2780 kB/s)
Reading package lists...
Reading package lists...
Building dependency tree...
Reading state information...
The following additional packages will be installed:
  netcat-traditional
The following NEW packages will be installed:
  netcat netcat-traditional
0 upgraded, 2 newly installed, 0 to remove and 18 not upgraded.
Need to get 76.0 kB of archives.
After this operation, 173 kB of additional disk space will be used.
Get:1 http://deb.debian.org/debian stretch/main amd64 netcat-traditional amd64 1.10-41+b1 [67.0 kB]
Get:2 http://deb.debian.org/debian stretch/main amd64 netcat all 1.10-41 [8962 B]
debconf: delaying package configuration, since apt-utils is not installed
Fetched 76.0 kB in 0s (512 kB/s)
Selecting previously unselected package netcat-traditional.
(Reading database ... 29937 files and directories currently installed.)
Preparing to unpack .../netcat-traditional_1.10-41+b1_amd64.deb ...
Unpacking netcat-traditional (1.10-41+b1) ...
Selecting previously unselected package netcat.
Preparing to unpack .../netcat_1.10-41_all.deb ...
Unpacking netcat (1.10-41) ...
Setting up netcat-traditional (1.10-41+b1) ...
update-alternatives: using /bin/nc.traditional to provide /bin/nc (nc) in auto mode
Setting up netcat (1.10-41) ...
Removing intermediate container c1953ca4dace
 ---> a71f280d4de8
Step 10/10 : CMD yarn start
 ---> Running in cd0abf2c0d1c
Removing intermediate container cd0abf2c0d1c
 ---> 486d4e9e9e6d
Successfully built 486d4e9e9e6d
Successfully tagged pushkin_server:latest
 Starting. You may not be able to load localhost for a minute or two.
```
