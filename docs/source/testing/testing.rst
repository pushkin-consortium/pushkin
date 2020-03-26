.. _testing:

Testing Pushkin with Jest
######################

`Jest <https://jestjs.io/en/>`_ is a JavaScript library for creating, running, and structuring tests.

Install Jest using ``npm``:

.. code-block:: bash

   $ npm install --save-dev jest

To use Babel, install required dependencies via ``npm``:

.. code-block:: bash

   $ npm install --save-dev babel-jest @babel/core @babel/preset-env

Configure Babel to target your current version of Node by creating a ``babel.config.js`` file in the root of your project:

.. code-block:: javascript

   // babel.config.js
    module.exports = {
        presets: [
            [
                '@babel/preset-env',
                {
                    targets: {
                        node: 'current',
                    },
                },
            ],
        ],
    };

The ideal configuration for Babel will depend on your project. See `Babel's docs <https://babeljs.io/docs/en/>`_ for more details.

To learn more about testing, go to `Jest official documentation <https://jestjs.io/docs/en/getting-started>`_.