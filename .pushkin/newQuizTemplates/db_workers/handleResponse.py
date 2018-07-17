import dbLogger

class Handler():
    def __init__(self, mainDbUrl, transDbUrl):
        self.dbLogger = dbLogger(mainDbUrl, transDbUrl)

    def handle(self, method, data):
        #########################################################################
        # map all api methods requested via the controller to functions
        # to be called from the main worker file
        #
        # using a mapping allows for helper functions to be used
        # that aren't directly accessible through the api
        #########################################################################
        methods = {
                "health": health,
                "totalQuestionsAnswered": totalQuestionResponses,
                "userQuestionsAnswered": userQuestionResponses,
                }

        notFound = lambda x: { 'message': 'method not found' }
        handler = methods.get(method, notFound)
        return handler(data)

    def queryDbMain(sql):
        return self.dbLogger.query(sql)

    #########################################################################
    # all methods below are rpc-used methods
    # and must return a jsonizable object
    #########################################################################

    def health(data):
        return { 'message': 'very healthy' }

    def totalQuestionResponses(data):
        return queryDbMain('SELECT COUNT(*) FROM "${QUIZ_NAME}_stimuli"')

    def userQuestionResponses(data):
        sql = """
            SELECT COUNT(*)
            FROM "${QUIZ_NAME}_stimulusResponses"
            WHERE user_id = {}
            """.format(data.user_id)
        return queryDbMain(sql)


    #########################################################################
    # not all enpoints yet implemented
    # see the api controller for the methods that are expected
    #########################################################################
