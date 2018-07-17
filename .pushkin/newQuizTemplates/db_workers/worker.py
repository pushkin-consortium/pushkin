import pika
import os
import json
import handleResponse


def consumeCallback(ch, method, props, body):
    bodyJSON = json.loads(body)
    rpcParamMethod = bodyJSON['method']
    rpcParamData = bodyJSON['data']

    print('method: {}\ndata: {}'.format(rpcParamMethod, rpcParamData))

    result = handler.handle(rpcParamMethod, rpcParamData)
    responseJSON = json.dumps(result)

    print('response: {}'.format(responseJSON))

    ch.basic_publish(exchange = '',
            routing_key = props.reply_to,
            properties = pika.BasicProperties(correlation_id=props.correlation_id),
            body = responseJSON
            )

    ch.basic_ack(delivery_tag = method.delivery_tag)
###############################
# start consuming
###############################

listenOnQueue = '${QUIZ_NAME}_api_queue'
rabbitAddress = os.environ['AMQP_ADDRESS']
mainDbUrl = os.environ['DATABASE_URL']
transDbUrl = os.environ['TRANSACTION_DATABASE_URL']

connParams = pika.URLParameters(rabbitAddress)
connection = pika.BlockingConnection(connParams)
channel = connection.channel()

channel.queue_declare(queue=listenOnQueue, durable=True)
channel.basic_qos(prefetch_count=1)

handler = handleResponse.Handler(mainDbUrl, transDbUrl)

channel.basic_consume(consumeCallback, queue=listenOnQueue)
print('consuming')
channel.start_consuming()




