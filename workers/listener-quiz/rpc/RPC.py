import json

class RPC(object):
    def __init__(self):
        self.method = None
        self.params = None
    def parse(self, body):
        j = json.loads(body)
        self.method = j['method']
        self.params = j['params']
    def to_JSON(self):
        return json.dumps({
            'method': self.method,
            'params': self.params
        })
    def __str__(self):
        return "RPC method: %s params: %r" % (self.method, self.params)