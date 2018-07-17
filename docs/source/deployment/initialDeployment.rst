.. _initial-deployment:

Initial Deployment
===================

Once you have installed Pushkin (:ref:`get-pushkin`), made a quiz running locally (:ref:`new-quiz`), and setup AWS (:ref:`setup_aws`) you're ready to deploy to the web.

Run::

  pushkin prep
  pushkin compile
  pushkin build all
  pushkin sync all

to prep, build, and push all files online. This may take a few minutes. Once it's done, run ``pushkin make compose`` to create a Docker compose file without any environment variables that includes your custom quiz workers, suitable for use with Rancher. The file generated will be called 'docker-compose.production.noEnvDependency.yml' by default, or whatever you've set ``pushkin_docker_compose_noDep_file`` to.

Now you're ready to :ref:`setup_rancher`.
