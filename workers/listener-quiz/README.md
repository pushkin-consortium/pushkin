![Pushkin Logo](http://i.imgur.com/ncRJMJ5.png)

# Python Worker

# Overview
* python worker for data analysis
* reads responses from a user and returns a new question
* calculates results


# Core Features
* `RPCClient` an easy way to get access to data without creating a bottleneck or a race condition
* `worker.py` the main startup script that coordinates responses and calls from the json api to the db.

RPCClient can be called in a similar fashion just like the JSON api, this works asynchronously so there is no hassles with promises or callbacks


```python
choice = client.call(json.dumps({
    'method': 'findChoice',
    'arguments': [1]
}))
```

# Get started
Most of the code is in `worker.py` there is a simple `if` statement that handles whether or not the script is looking for the next question, or calculating the results.

the key difference between calculating results and searching for the next question is this:
When you ask for the next question, the worker calculates the next question, then tells **the db worker** to read it and pass it to the **api**
when you ask for the results, the worker calculates the results and **the worker** passes them to the api

# How does it work
When generating a new worker by `pushkin generate worker [yourQuizName]`, it is : 
- added to the docker compose file
- each worker listens to task ques prefixed by [yourQuizName]

# How to modify
New worker files generated could be found in `pushkin` folder. The folder name is prefixed by [yourQuizName] : `pushkin/[yourQuizName]-worker`. You could edit `index.py` within that folder.

# Extension
I am not a python expert, any refactoring on this would be much appreciated.
