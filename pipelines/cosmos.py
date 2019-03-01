import nebula.connector
from nebula.data_controller.CSVDataController import CSVDataController
from nebula.model.ActiveSetModel import ActiveSetModel
from nebula.model.SimilarityModel import SimilarityModel
import nebula.pipeline

import sys
import zerorpc

def main():
    if len(sys.argv) < 4:
        print "Usage: python main.py <port> <csv file path> <raw data folder path> <pipeline arguments>"
    
 
    csvfile = sys.argv[2]
    raw_folder = sys.argv[3]
    
    # Create a Pipeline object from the nebula.pipeline module
    pipeline = nebula.pipeline.Pipeline()
    
    # Create an ActiveSetModel object from the nebula.model module, starts out empty
    relevance_model = ActiveSetModel()
    
    ### Continue from here
    
    # Create a SimilarityModel object from the nebula.model module, which does 
    # forward and inverse MDS
    # projections and stores the current set of similarity weights
    similarity_model = SimilarityModel()
    
    # Create a CSVDataController object from the nebula.data module, providing
    # a CSV file to load data from and the path to a folder containing the raw
    # text for each document. 
    # IMPORTANT: The CSV file should not be changed hereafter
    data_controller = CSVDataController(csvfile, raw_folder)
   
    # Create a ZeroMQConnector object from the nebula.connector module, which
    # defines a method for listening for the three types of user defined 
    # messages: update, get, and reset. 
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    
    # Next we add the models to the pipeline. New models would be added here.
    # The order that the models are
    # added is the order in which they are executed in the forward pipeline.
    # IMPORTANT: They are executed in reverse order in the inverse pipeline
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