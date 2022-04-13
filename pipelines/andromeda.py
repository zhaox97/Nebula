import os
import sys

script_dir = os.path.dirname( __file__ )
nebula_pipeline_dir = os.path.join( script_dir, '..', 'Nebula-Pipeline')
sys.path.append(nebula_pipeline_dir)

from nebula.pipeline import Pipeline
from nebula.connector import SocketIOConnector
from nebula.data_controller.CSVDataController import CSVDataController
from nebula.model.AndromedaModel import AndromedaModel
import asyncio



async def main():
    if len(sys.argv) < 3:
        print("Usage: python main.py <port> <csv file path> <pipeline arguments>")
    
    csvfile = sys.argv[2]
    
    # pipeline = nebula.pipeline.Pipeline()
    pipeline = Pipeline()
   
    andromeda = AndromedaModel(dist_func="euclidean")
    data_controller = CSVDataController(csvfile)
   
    pipeline.append_model(andromeda)
    pipeline.set_data_controller(data_controller)
    
    # connector = nebula.connector.PrintConnector(port=int(sys.argv[1]))

    connector = SocketIOConnector(port=int(sys.argv[1]))
    pipeline.set_connector(connector)
    await connector.makeConnection(port=int(sys.argv[1]))
    # pipeline.set_connector(connector)
    
    pipeline.start(sys.argv[3:])
    
if __name__ == "__main__":
    asyncio.run(main())
