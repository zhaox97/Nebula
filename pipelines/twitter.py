import nebula.connector
from nebula.data_controller.TwitterDataController import TwitterDataController
import nebula.model
import nebula.pipeline

import sys
import zerorpc

def main():
    if len(sys.argv) < 2:
        print "Usage: python main.py <port> <pipeline arguments>"
    
    access_token = "22705576-1RXheyykqon2L6DgUIBtLcqrqeyb5PzIAiTpkN2Eh"
    access_token_secret = "lBX6JsFWkB1vYM0V3RHQjuWz9gclBc4ZvWACerDTB8O8h"
    consumer_key = "eNHZNhaOd0QFkCwKqb2si9Of5"
    consumer_secret = "Ltj6z3BkDanYnjqZwXCcNKiBSu7MoxUrJrHZgPUsnmBSBVoUNu"
    
    pipeline = nebula.pipeline.Pipeline()
   
    relevance = nebula.model.ActiveSetModel()
    similarity = nebula.model.SimilarityModel()
    data_controller = TwitterDataController(access_token=access_token,
                                                        access_token_secret=access_token_secret,
                                                        consumer_key=consumer_key,
                                                        consumer_secret=consumer_secret)
   
    pipeline.append_model(relevance)
    pipeline.append_model(similarity)
    pipeline.set_data_controller(data_controller)
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[2:])
    
if __name__ == "__main__":
    main()