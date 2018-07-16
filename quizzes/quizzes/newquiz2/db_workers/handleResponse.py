import psycopg2
import os

def dbConnData():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def queryDbMain(sql):
    conn = None
    try:
        conn = dbConnData()
        cur = conn.cursor()
        cur.execute(sql)
        result = cur.fetchall()
        cur.close()
        return result

    except (Exception, psycopg2.DatabaseError) as err:
        print(err)
        return { 'message': 'query error: {}'.format(err) }

    finally:
        if conn is not None:
            conn.close()

#########################################################################
# all methods below are rpc-used methods
# and must return a jsonizable object
#########################################################################

def health(data):
    return { 'message': 'very healthy' }

def totalQuestionResponses(data):
    return queryDbMain('SELECT COUNT(*) FROM "newquiz2_stimuli"')

def userQuestionResponses(data):
    sql = 'SELECT COUNT(*) FROM "newquiz2_stimulusResponses" WHERE user_id = {}'.format(data.user_id)
    return queryDbMain(sql)


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


#########################################################################
# not yet implemented
# see the api controller for the methods that are expected
#########################################################################

# totalQuestionsAnswered

# topTen
# params: [ ` SELECT "newquiz2_stimulusResponses".user_id, COUNT("${QUIZ_NAME}_stimulusResponses".user_id) FROM "${QUIZ_NAME}_stimulusResponses" GROUP BY "${QUIZ_NAME}_stimulusResponses".user_id   ` ]

# randomFromUser
"""
					`SELECT "newquiz2_stimuli".id,
									"newquiz2_stimuli".stimulus,
									"newquiz2_stimuli".options
					 FROM "newquiz2_stimuli"
					 WHERE "newquiz2_stimuli".stimulus NOT IN (
						 SELECT stimulus from "newquiz2_stimulusResponses" WHERE user_id = ${user_id}
					 )
					 ORDER BY RANDOM()
					 LIMIT 1
					 `
"""

# random
"""
`SELECT * from "newquiz2_stimuli"
 ORDER BY RANDOM()
 LIMIT 1`
"""

# user
#  `SELECT * FROM "newquiz2_users" WHERE "auth0_id" = '${req.params.auth_id}' LIMIT 1`



