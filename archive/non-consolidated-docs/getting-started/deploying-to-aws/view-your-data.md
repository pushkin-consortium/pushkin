# View Your Data

After you have deployed to AWS, you will want to view your data. 

An introduction to viewing your database with a Postgres manager is given in the [Quickstart](../../getting-started/quickstart/README.md#viewing-your-database-with-a-postgres-manager). Start there for information about how to download and install [pgAdmin](https://www.pgadmin.org/download/) and how to view your data when testing locally.

This tutorial will cover how to view your data from an AWS deployment. 

## Setup

1. Make sure your site has successfully been deployed using AWS. 
2. Open the `pushkin.yaml` for your site in a text editor.
3. Start pgAdmin, which will open in your browser. 

## Add a new server

By default, a database called *Main* is created when you deploy to AWS. Find this in your `pushkin.yaml`, which should look something like this:

```yaml
experimentsDir: experiments
coreDir: pushkin
DockerHubID: yourdockerhubid
databases:
  localtestdb:
    user: postgres
    pass: example
    url: test_db
    name: test_db
    host: localhost
info:
  rootDomain: mydomain.com
  whoAmI: Citizen Science Website
  hashtags: 'science, learn'
  email: me@mydomain.com
  shortName: CSW
  projName: myproject
  awsName: myproject4c2da3b2-d5dc-4414-9d1f-9b30031333bb
addons:
  useForum: false
  useAuth: true
  authDomain: <YOUR_AUTH0_DOMAIN>
  authClientID: <YOUR_AUTH0_CLIENT_ID>
salt: abc123
fc:
  popup: false
productionDBs:
  Main:
    type: Main
    name: myprojectMain
    host: myprojectmain.c3iwcrbpuehx.us-east-1.rds.amazonaws.com
    user: postgres
    pass: '0.9073399739822692'
    port: 5432
  Transaction:
    type: Transaction
    name: myprojectTransaction
    host: myprojecttransaction.c3iwcrbpuehx.us-east-1.rds.amazonaws.com
    user: postgres
    pass: '0.8091098674547545'
    port: 5432
```

Under `productionDBs`, find your `Main` database. You will need information from this section to complete the following steps:

1. In the pgAdmin dashboard, under the *Quick Links*, click **Add New Server**.
2. You can set the name of the server to anything, for example `Pushkin AWS Deploy`. 
3. Then move to the *Connection* tab and set **Host name/address** to `host` as it is specified in your `pushkin.yaml`. In the example above, it would be: `myprojectmain.c3iwcrbpuehx.us-east-1.rds.amazonaws.com`. 
4. Set the password to the your randomly generated password&mdash;`0.9073399739822692` in the above example.
5. Click **Save** and your *Pushkin AWS Deploy* server should appear in the left sidebar.

## View your data

To view your data tables, navigate to the left sidebar:

1. Click to expand your *Pushkin AWS Deploy* server.
2. Select **myprojectMain** under *Databases*. 
3. Select **Schemas**, which will also open its subitem **public**. 
4. Under **public**, choose **Tables**.

By default, you should have 5 tables: `knex_migrations`, `knex_migrations_lock`, `pushkin_userMeta`, `pushkin_userResults`, and `pushkin_users`. You should also have one table for each experiment. If your experiment is called `mind`, you should have `mind_stimulusResponses`. 

To view a given table, right-click on it, hover over *View/Edit Data*, and click on **All Rows**, which will then appear in a new pgAdmin tab.

For more information on how to use pgAdmin, you can read their documentation [here](https://www.pgadmin.org/docs/).
