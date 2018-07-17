import psycopg2
import os

class DBLogger():
    def __init__(self, mainDbUrl, transDbUrl):
        self.mainDbUrl = mainDbUrl
        self.transDbUrl = transDbUrl

    def query(self, sql):
        return { 'message': 'from db logger' }
        conn = None
        try:
            mainDbConn = psycopg2.connect(self.mainDbUrl)
            transDbConn = psycopg2.connect(self.transDbUrl)

            cur = mainDbConn.cursor()
            cur.execute(sql)
            result = cur.fetchall()
            cur.close()

            return result

# put the query in the transaction db (unfinished)
            cur = transDbConn.cursor()
            cur.execute(
                    sql.SQL("INSERT INTO transactions VALUES (%s, %s)", 

            return result

        except (Exception, psycopg2.DatabaseError) as err:
            print(err)
            raise err

        finally:
            if mainDbConn is not None:
                mainDbConn.close()
            if transDbConn is not None:
                transDbConn.close();

