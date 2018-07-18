import dbLogger

class Handler():
    def __init__(self, mainDbUrl, transDbUrl):
        self.dbLogger = dbLogger(mainDbUrl, transDbUrl)

    def handle(self, method, data):
        # map all api methods requested via the controller to functions
        # to be called from the main worker file
        methods = {
                "nextQuestion": getNextUserQuestion,
                "questionsAnswered": countUserQuestionsAnswered,
                "createResponse": createUserResponse,
                "health": health,
                "random": getRandomQuestion,
                "getAllQuestions": getAllQuestions,
                "totalQuestions": countAllAnsweredQuestions
                }
        notFound = lambda x: { 'message': 'method not found' }

        return methods.get(method, notFound)(data)

    # used to enforce logging in the transaction database
    def queryDbMain(self, sql):
        return self.dbLogger.query(sql)

    #########################################################################
    # all methods below either correspond to api endpoints/methods or
    # are used as helper functions for others that do.
    # must return a jsonizable object
    #########################################################################

    def getNextUserQuestion(self, data):
        return { 'message': 'not implemented' }

    def countUserQuestionsAnswered(self, data):
        sql = """
            SELECT COUNT(*)
            FROM "${QUIZ_NAME}_stimulusResponses"
            WHERE user_id = {}
            """.format(data.user_id)
        return queryDbMain(sql)

    def createUserResponse(self, data):
        return { 'message': 'not implemented' }

    def health(self, data):
        return { 'message': 'very healthy' }

    def random(self, data):
        return { 'message': 'not implemented' }

    def getAllQuestions(self, data):
        return { 'message': 'not implemented' }

    def countAllAnsweredQuestions(self, data):
        return { 'message': 'not implemented' }


    #########################################################################
    # not all enpoints yet implemented
    # see the corresponding api controller for the methods that are expected
    #########################################################################
