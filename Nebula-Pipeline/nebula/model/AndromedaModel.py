# -*- coding: utf-8 -*-
import os


__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))

from nebula.pipeline import INTERACTION

from .SimilarityModel import SimilarityModel



class AndromedaModel(SimilarityModel):
    
    def __init__(self, **kwargs):
        super(AndromedaModel, self).__init__(**kwargs)
    
    def inverse(self, data):
        """Override the inverse function to add in the parameter update
        interactions."""
        
        # First call the original inverse to handle OLI updates
        super(AndromedaModel, self).inverse(data)
       
        interaction = data[INTERACTION]
        
        if interaction == "pi":
            param = data["param"]
            value = float(data["value"])
            
            if param not in self._weights:
                print("Parameter not found for PI")
                return
            if value < 0 or value > 1:
                print("Invalid value for parameter, must be [0, 1]")
                return
            
            value = max(0.01, min(0.99, value))
            
            # First get the current weight of the changed parameter
            cur_weight = self._weights[param]

            # Fraction of weight to take (or give to) other dimensions
            change_fraction = (1.0 - value) / (1.0 - cur_weight)
       
            for a in self._weights:
                if a == param:
                    continue
                
                self._weights[a] *= change_fraction
                
            self._weights[param] = value
           
            self._new_weights = True
