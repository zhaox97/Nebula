import numpy as np
import sys
import os

sys.path.insert(0, os.path.abspath('..'))
import nebula.model as model
import nebula.pipeline as pipeline

sm = model.SimilarityModel()

high_d = [[0, 25, 80, 90, 15], [30, 25, 20, 85, 50], [100, 80, 25, 95, 70], [15, 50, 0, 20, 20]]

docs = []
for i in range(len(high_d)):
    docs.append({"high_d": high_d[i], "doc_id": str(i)})
    
data = {}
data["documents"] = docs

sm.forward(data)

data[pipeline.INTERACTION] = "oli"

low_d = [[-1, -1], [-1, -1], [1, 1], [1, 1]]
points = {}
for i in range(len(low_d)):
    points[str(i)] = {"lowD": low_d[i]}
data["points"] = points

sm.inverse(data)
print sm._weights

andromeda = model.Andromeda()

attributes = {"0": 0, "1": 1, "2": 2, "3": 3, "4": 4}
data[pipeline.ATTRIBUTES] = attributes
andromeda.setup(data)

andromeda.forward(data)
print data
print andromeda._weights
andromeda.inverse({"interaction": "pi", "param": "1", "value": .6})
andromeda.inverse({"interaction": "pi", "param": "3", "value": .8})
andromeda.inverse({"interaction": "pi", "param": "1", "value": 0})
andromeda.inverse({"interaction": "pi", "param": "2", "value": .7})