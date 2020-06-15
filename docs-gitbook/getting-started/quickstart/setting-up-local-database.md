# Setting up a local database

For now, let’s use the test database that is built by `pushkin init site`. We need to populate it with stimuli for our experiment\(s\):

```bash
$ docker-compose -f pushkin/docker-compose.dev.yml start test_db
$ pushkin setupdb
$ docker-compose -f pushkin/docker-compose.dev.yml stop test_db
```

