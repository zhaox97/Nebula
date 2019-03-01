import nebula.connector
from nebula.data_controller.ESController import ESController
import nebula.model
import nebula.pipeline
import nebula.tf

import sys
import zerorpc

def main():
    if len(sys.argv) < 2:
        print "Usage: python main.py <port> <csv file path> <raw data folder path> <pipeline arguments>"
   
    
    pipeline = nebula.pipeline.Pipeline()
   
    relevance = nebula.model.ActiveSetModel()
    similarity = nebula.model.SimilarityModel()
    data_controller = ESController()
    tfModel = nebula.tf.TFModel()


    pipeline.append_model(tfModel)
    pipeline.append_model(relevance)
    pipeline.append_model(similarity)
    pipeline.set_data_controller(data_controller)
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[2:])
    
if __name__ == "__main__":
    main()