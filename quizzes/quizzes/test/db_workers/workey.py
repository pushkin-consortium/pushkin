import pika
import os
import json
import handleResponse


def consumeCallback(ch, method, props, body):
    bodyJSON = json.loads(body)
    rpcParamMethod = bodyJSON['method']
    rpcParamData = bodyJSON['data']

    print('method: {}\ndata: {}'.format(rpcParamMethod, rpcParamData))

    handler = handleResponse.methods.get(rpcParamMethod, lamba x: { 'message': 'method not found' })
    responseJSON = json.dumps(handler(rpcParamData))

    print('response: {}'.format(responseJSON))

    ch.basic_publish(exchange = '',
            routing_key = props.reply_to,
            properties = pika.BasicProperties(correlation_id=props.correlation_id),
            body = responseJSON
            )

    ch.basic_ack(delivery_tag = method.delivery_tag)



def main(listenOnQueue, rabbitAddress):
    connParams = pika.URLParameters(rabbitAddress)
    connection = pika.BlockingConnection(connParams)
    channel = connection.channel()

    channel.queue_declare(queue=listenOnQueue, durable=True)
    channel.basic_qos(prefetch_count=1)
    
    channel.basic_consume(consumeCallback, queue=listenOnQueue)
    print('consuming')
    channel.start_consuming()

if __name__ == '__main__':
    listenOnQueue = 'test_api_queue'
    rabbitAddress = os.environ['AMQP_ADDRESS']
    print('rabbitAddress: {}'.format(rabbitAddress))
    print('listenOnQueue: {}'.format(listenOnQueue))
    main(listenOnQueue, rabbitAddress)
