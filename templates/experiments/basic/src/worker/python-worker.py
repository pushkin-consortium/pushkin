import pika
import json
from model import HandednessModel

def main():
    
    model = HandednessModel()

    
    connection = pika.BlockingConnection(pika.ConnectionParameters(host='rabbitmq'))
    channel = connection.channel()

    
    channel.queue_declare(queue='basic_path_python_worker')

    def on_request(ch, method, properties, body):
        
        message = json.loads(body)
        key_press = message.get('key_press')

        
        prediction = model.predict(key_press)

        
        response = {'prediction': prediction}

        
        ch.basic_publish(
            exchange='',
            routing_key=properties.reply_to,
            properties=pika.BasicProperties(correlation_id=properties.correlation_id),
            body=json.dumps(response)
        )

        ch.basic_ack(delivery_tag=method.delivery_tag)

    
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue='basic_path_python_worker', on_message_callback=on_request)

    print(" [x] Awaiting RPC requests")
    channel.start_consuming()

if __name__ == "__main__":
    main()