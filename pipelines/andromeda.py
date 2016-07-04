import nebula.connector
import nebula.data
import nebula.model
import nebula.pipeline

import sys
import zerorpc

def main():
    if len(sys.argv) < 3:
        print "Usage: python main.py <port> <csv file path> <pipeline arguments>"
    
    csvfile = sys.argv[2]
    
    pipeline = nebula.pipeline.Pipeline()
   
    andromeda = nebula.model.Andromeda(dist_func="euclidean")
    #composite = nebula.model.CompositeModel()
    data_controller = nebula.data.CSVDataController(csvfile)
   
    pipeline.append_model(andromeda)
    #pipeline.append_model(composite)
    pipeline.set_data_controller(data_controller)
    
    connector = nebula.connector.ZeroMQConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[3:])
    
if __name__ == "__main__":
    main()