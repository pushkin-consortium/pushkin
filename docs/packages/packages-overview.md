# Overview of Pushkin Packages

Pushkin is comprised of multiple modular packages(1):
{ .annotate }

1. [Site](../site-templates/site-templates-overview.md) and [experiment templates](../exp-templates/exp-templates-overview.md) are also implemented as packages, but are discussed in their own sections of the documentation.

- [**`pushkin-cli`**](./pushkin-cli.md) ([npm](https://www.npmjs.com/package/pushkin-cli)): The centerpiece of the Pushkin ecosystem and the user's primary tool for creating their Pushkin site. When installed globally, the user can run `pushkin` commands to install, prepare, and deploy their site.
- [**`pushkin-api`**](./pushkin-api.md) ([npm](https://www.npmjs.com/package/pushkin-api)): Essentially a mini-server designed with the use case of interfacing between pushkin-client and pushkin-worker via RabbitMQ.
- [**`pushkin-client`**](./pushkin-client.md) ([npm](https://www.npmjs.com/package/pushkin-client)): A module that provides simplified methods for making calls to a Pushkin API and unpacking data sent back from a worker. Note that built-in functions assume the API has corresponding default routes enabled to handle such requests.
- [**`pushkin-worker`**](./pushkin-worker.md) ([npm](https://www.npmjs.com/package/pushkin-worker)): Receives messages from RabbitMQ and runs whatever functionality it’s told to run, sending the result back through the queue it came from. Designed to be on the receiving end of a Pushkin API. Comes with built-in simple functions that most users will probably want, like `getAllStimuli`.
