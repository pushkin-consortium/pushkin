import pika
import os
import json
import handleResponse

def consumeCallback(ch, method, props, body):
    print('RECEIVED RPC')
    bodyJson = json.loads(body)
    # body is expected to have these from the api controller
    rpcParamMethod = bodyJSON['method']
    rpcParamData = bodyJSON['data']

    result = handler.handle(rpcParamMethod, rpcParamData)
    responseJson = json.dumps(result)

    ch.basic_publish(exchange = '',
            routing_key = props.reply_to,
            properties = pika.BasicProperties(correlation_id=props.correlation_id),
            body = responseJson
            )

    ch.basic_ack(delivery_tag = method.delivery_tag)

#multiple queues
#def on_queue_declare(ch):
#    print('listening on {}'.format(readQueue))
#    ch.basic_consume(consumeCallback, queue=readQueue)
#    print('listening on {}'.format(writeQueue))
#    ch.basic_consume(consumeCallback, queue=writeQueue)
#
#def on_channel_open(ch):
#    ch.basic_qos(prefetch_count=1)
#
#    ch.queue_declare(callback=on_queue_declare, queue=readQueue, durable=False)
#    ch.queue_declare(queue=on_queue_declare, durable=True)
#
#
#def on_open(con):
#    con.channel(on_channel_open)

###############################
# setup
###############################

readQueue = '${QUIZ_NAME}_quiz_db_read'
writeQueue = '${QUIZ_NAME}_quiz_db_write'

rabbitAddress = os.environ['AMQP_ADDRESS']
mainDbUrl = os.environ['DATABASE_URL']
transDbUrl = os.environ['TRANSACTION_DATABASE_URL']

handler = handleResponse.Handler(mainDbUrl, transDbUrl)

###############################################
# consume
###############################################
connParams = pika.URLParameters(rabbitAddress)
connection = pika.BlockingConnection(connParams)

channel = connection.channel()
channel.queue_declare(queue=readQueue, durable=False)
print('just consuming on {} (no write yet)'.format(readQueue))
channel.basic_consume(consumeCallback, queue=readQueue)

#multiple queues
#try:
#    channel = connection.ioloop.start()
#except KeyboardInterrupt:
#    connection.close()
