.. _exp_worker:

Experiment Worker Component
============================
Workers handle the most complex aspect of a Pushkin experiment and different types of experiments could need workers with very different functionalities. Pushkin provides a simple template written in Javascript to start with.

The job of a worker is to receive messages via RabbitMQ that (usually) come from an API controller. It looks up the appropriate information in the database and returns it to the requester. Workers are also the component that is responsible for implementating machine learning, as having direct access to this data allows it to make live, dynamic decisions during an experiment like what stimuli to serve next or predictions about a subject's next answers.
