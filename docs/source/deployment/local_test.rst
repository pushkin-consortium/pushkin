.. _local_test:

Local Deployment
##################




DEV: Local Deployment Stack
------------------

In the official website templates, the ``front end`` app was created with `create-react-app <https://github.com/facebook/create-react-app>`. This handle toolbox handles babel and webpack so that you don't have to. 

By default, create-react-app expects local tests to listen on port 3000. However, this is the port that our API uses. Thus, you will see that the custom start script in ``package.json`` requests port 80:

:: javascript
  
  "scripts": {
    "start": "PORT=80 react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },

The `docker-compose.dev.yml` file likewise specifies that port 80 is open. 

:: json

  server:
    build: ./front-end
    environment:
      API_PORT: '3000'
    ports:
      - '80:80'
      - '433:433'
    links:
      - api



.. include:: ../links/links.rst
