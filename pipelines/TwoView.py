import nebula.connector
import nebula.data
import nebula.model
import nebula.pipeline

import sys
import zerorpc

def main():
    if len(sys.argv) < 4:
        print "Usage: python main.py <port> <csv file path> <raw data folder path> <pipeline arguments>"
    
    
    csvfile = sys.argv[2]
    raw_folder = sys.argv[3]
    
    pipeline = nebula.pipeline.Pipeline()
    
    #Create an ImportanceModel object from the nebula.model module, starts out empty
    relevance_model = nebula.model.ImportanceModel()
   
    # Create a SimilarityModel object from the nebula.model module, which does 
    # forward and inverse MDS
    # projections and stores the current set of similarity weights
    similarity_model = nebula.model.SimilarityModel(dist_func="euclidean")
    
    
    data_controller = nebula.data.CSVDataController(csvfile, raw_folder)
   
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    
    
    pipeline.append_model(relevance_model)
    pipeline.append_model(similarity_model)
    
    # Note: a pipeline contains exactly one data controller
    pipeline.set_data_controller(data_controller)
    
    # Note: a pipeline contains exactly one connector
    pipeline.set_connector(connector)
    
    # Starts the pipeline, running the setup for the data controller and each
    # model, and then tells the connector to start listening for connections.
    # The pipeline can take command line arguments to set user defined model
    # parameters.
    pipeline.start(sys.argv[4:])
    
if __name__ == "__main__":
    main()