import sys
#sys.path.append('Nebula-Pipeline')
import nebula.connector
from nebula.data_controller.ESController import ESController
from nebula.model.ActiveSetModel import ActiveSetModel
from nebula.model.TopicModel import TopicModel
from nebula.model.TopicSimilarityModel import TopicSimilarityModel
import nebula.pipeline
from nebula.model.tf import TFModel

import sys

def main():
    if len(sys.argv) < 2:
        print "Usage: python main.py <port> <csv file path> <raw data folder path> <pipeline arguments>"
   
    
    pipeline = nebula.pipeline.Pipeline()
   
    relevance = ActiveSetModel()
    similarity = TopicSimilarityModel()
    topic_model = TopicModel()
    data_controller = ESController()
    tfModel = TFModel()


    pipeline.append_model(tfModel)
    pipeline.append_model(relevance)
    pipeline.append_model(topic_model)
    pipeline.append_model(similarity)
    pipeline.set_data_controller(data_controller)
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[2:])
    
if __name__ == "__main__":
    main()
