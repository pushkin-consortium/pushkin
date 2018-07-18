import pika
import os
import json
import handleResponse

def consumeCallback(ch, method, props, body):
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

def on_channel_open(ch):
    ch.basic_qos(prefetch_count=1)

    ch.queue_declare(queue=readQueue, durable=False)
    ch.queue_declare(queue=writeQueue, durable=True)

    ch.basic_consume(consumeCallback, queue=readQueue)
    ch.basic_consume(consumeCallback, queue=writeQueue)

def on_open(con):
    con.channel(on_channel_open)

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
connection = pika.SelectConnection(parameters=connParams,
                                on_open_callback=on_open)
try:
    channel = connection.channel()
except KeyboardInterrupt:
    connection.close()
