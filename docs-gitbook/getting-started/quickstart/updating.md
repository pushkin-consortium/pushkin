# Updating

If you make updates to your website, here is how to re-launch a local test version:

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml stop
$ pushkin prep
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin setupdb
$ docker-compose -f pushkin/docker-compose.dev.yml stop test_db
$ docker-compose -f pushkin/docker-compose.dev.yml up --build --remove-orphans;
```

