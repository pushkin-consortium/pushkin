.. _pushkin_api_test:

Unit Tests of Pushkin API
=============
This part is about unit tests of Pushkin API. The JavaScript test framework Jest is used. 

The constructor of ControllerBuilder class gives each ControllerBuilder object three arrays. The methods of ControllerBuilder, such as ``setPass()`` and ``setDirectUse()``, put httpMethods, rpcMethods, route into those arrays. The idea of tests is, checking the length of those arrays after those methods are called. If the length increases, the methods run successfully.

constructor
----------
**Result:** successful

The test shows that after the method call, the three arrays are initilized.

-------------------

setPass
-------------
**Result:** successful

The test shows that after the method call, all the arguments are put into the passAlongs array and the length of this array increases by one.

-------------------

setDefaultPasses
------------------
**Result:** successful

The test shows that after the method call, the length of passAlongs array increases by four because of 4 times calls of ``setPass()`` inside this method

-------------------

setDirectUse
-------------
**Result:** successful

The test shows that after the method call, all the arguments are put into the directUses array and the length of this array increases by one.

