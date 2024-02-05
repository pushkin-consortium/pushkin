# Experiment Component Structure

From the perspective of the web server, a Pushkin experiment involves a number of distinct elements. There is the HTML/Javascript for the stimulus display and response recording \(the “front end”\). There is the database, where data are stored. There is the worker, which handles reading and writing from the database \(plus potentially many other behind-the-scenes work!\). Finally, there is the API, which communicates between the front end and the worker.

For convenience, all the code is kept in the experiments folder as defined in `pushkin.yaml`. The CLI command [prep](../pushkin-cli.md#prep) automagically redistributes this code where it needs to go.

* [Config File](experiment-config-files.md)
* [Experiment Web Page Component](experiment-web-page-component.md)
* [Recommended Structure](experiment-web-page-component.md#recommended-structure)
* [Customizing the client](experiment-web-page-component.md#customizing-the-client)
* [Worker](worker-component-migration-and-seed.md#experiment-worker-component)
* [Migrations](worker-component-migration-and-seed.md#experiment-migrations)
* [Seeds](worker-component-migration-and-seed.md#experiment-seeds)

