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
    print csvfile
    raw_folder = sys.argv[3]
    
    pipeline = nebula.pipeline.Pipeline()
   
    relevance = nebula.model.ActiveSetModel()
    similarity = nebula.model.SimilarityModel()
    composite = nebula.model.CompositeModel()
    data_controller = nebula.data.CSVDataController(csvfile, raw_folder)
   
    corpus = nebula.model.CorpusSetModel()
    #pipeline.append_model(corpus)
   
    pipeline.append_model(relevance)
    pipeline.append_model(similarity)
    #pipeline.append_model(composite)
    pipeline.set_data_controller(data_controller)
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[4:])
    
if __name__ == "__main__":
    main()