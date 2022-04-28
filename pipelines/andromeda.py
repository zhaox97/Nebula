import os
import sys

# Most recent version of Python3 needs some help to find reletive paths to modules.
# The follwoing three lines will ensure that Python3 will be able to find the modules
# that are needed in this file.
script_dir = os.path.dirname( __file__ )
nebula_pipeline_dir = os.path.join( script_dir, '..', 'Nebula-Pipeline')
sys.path.append(nebula_pipeline_dir)
data_controller_dir = os.path.join( script_dir, '..', 'Nebula-Pipeline', 'data_controller')
sys.path.append(data_controller_dir)
model_dir = os.path.join( script_dir, '..', 'Nebula-Pipeline', 'model')
sys.path.append(model_dir)

from nebula.pipeline import Pipeline
from nebula.connector import SocketIOConnector
from data_controller.CSVDataController import CSVDataController
from model.AndromedaModel import AndromedaModel
import asyncio

async def main():
    # Usage error check to ensure this file is receiving the correct number of arguments
    if len(sys.argv) < 3:
        print("Usage: python main.py <port> <csv file path> <pipeline arguments>")

    # Collects the CSV file from teh arguments provided
    csvfile = sys.argv[2]

    # Initiate a pipeline instance
    pipeline = Pipeline()

    # Creates an instance of teh Andromeda model to be used by the pipeline
    andromeda = AndromedaModel(dist_func="euclidean")
    # Creates instance of CSVDataController to be used by pipeline
    data_controller = CSVDataController(csvfile)

    # Following two lines connect the andromeda instance and data controller instance to pipeline
    pipeline.append_model(andromeda)
    pipeline.set_data_controller(data_controller)

    # Sets up and instance of SocketIOConnector to be used by pipeline
    connector = SocketIOConnector(port=int(sys.argv[1]))

    # Following line tells the pipeline to use the previousluy instantiated connector
    pipeline.set_connector(connector)

    # Following line creates a connection between the Python3 code and JS code
    await connector.makeConnection(port=int(sys.argv[1]))

    pipeline.start(sys.argv[3:])
    
if __name__ == "__main__":
    asyncio.run(main())
