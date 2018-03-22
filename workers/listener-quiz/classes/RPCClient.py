import os
import uuid
import pika

RABBITLINK = os.environ['AMPQ_ADDRESS']

class RPCClient(object):
    """This class handles a simple rpc call """
    def __init__(self):

        print "creating a channel"
        parameters = pika.URLParameters(RABBITLINK)
        parameters.heartbeat = 0
        self.connection = pika.BlockingConnection(parameters)
        self.channel = self.connection.channel()
        result = self.channel.queue_declare(exclusive=True)
        self.callback_queue = result.method.queue
        self.channel.basic_consume(self.on_response, no_ack=True, queue=self.callback_queue)
    def on_response(self, ch, method, props, body):
        """ Handles the response from the RPC """
        if self.corr_id == props.correlation_id:
            print "received response from rpc"
            self.response = body
    def call(self, body):
        print "rpc called with %r" % body
        """ Passed a json object into rabbit as an RPC"""
        self.response = None
        self.corr_id = str(uuid.uuid4())
        print "Publishing to channel"
        print self.callback_queue
        self.channel.basic_publish(
            exchange='',
            routing_key='db_rpc_worker',
            properties=pika.BasicProperties(
                reply_to=self.callback_queue,
                correlation_id=self.corr_id
            ),
            body=str(body)
            )
        while self.response is None:
            self.connection.process_data_events()
        return str(self.response)


# EXAMPLE OF USER RPC CLIENT
# client = RPCClient()
# rpc = {
#   'method': 'getInitialQuestions'
# }

# response = client.call(json.dumps(rpc))
# user =  client.call(json.dumps({ 
#     'method': 'findUser',
#     'arguments': [6]
# }))
# question =  client.call(json.dumps({ 
#     'method': 'findQuestion',
#     'arguments': [2]
# }))
# choice =  client.call(json.dumps({ 
#     'method': 'findChoice',
#     'arguments': [3]
# }))
# print question
# print user
# print choice