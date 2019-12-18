.. _experiment_structure:

Experiment Structure
##################
From the perspective of the web server, a Pushkin experiment involves a number of distinct elements. There is the HTML/Javascript for the stimulus display and response recording (the "front end"). There is the database, where data are stored. There is the worker, which handles reading and writing from the database (plus potentially many other behind-the-scenes work!). Finally, there is the API, which communicates between the front end and the worker. 

For convenience, all the code is kept in the experiments folder as defined in ``pushkin.yaml``. The CLI command prep_ automagically redistributes this code where it needs to go. 	

.. toctree::
   :maxdepth: 1

   Config File <exp_config>
   Web Page <exp_webpage>
   API <exp_api>
   Worker <exp_worker>
   Migrations <exp_migrations>
   Seeds <exp_seeds>
