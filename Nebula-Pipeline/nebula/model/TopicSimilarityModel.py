# -*- coding: utf-8 -*-
import itertools
import json
import os
import subprocess

import numpy as np
from scipy.stats.mstats import zscore

from .SimilarityModel import SimilarityModel

from .DistanceFunctions import euclidean, cosine

__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))

# The list of documents passed through the forward pipeline
from nebula.pipeline import DOCUMENTS
# The ID of each document with the document list
from nebula.pipeline import DOC_ID
# The high dimensional position of each document within the list
#from nebula.pipeline import HIGHD_POSITION
# A map of attributes for a document. Alternative way of storing position
#from nebula.pipeline import DOC_ATTRIBUTES
# A map of topics for a document. The new way to store position
from nebula.pipeline import DOC_TOPICS
# The low dimensional position of each document within the list
from nebula.pipeline import LOWD_POSITION
# The relevance of each document within the list
#from nebula.pipeline import DOC_RELEVANCE
# A set of attribute names that exist in the data
#from nebula.pipeline import ATTRIBUTES
# A dictionary of attribute weights
#from nebula.pipeline import ATTRIBUTE_RELEVANCE
# A dictionary of attribute weight deltas from the most recent interaction
#from nebula.pipeline import ATTRIBUTE_RELEVANCE_DELTA
# A list of weights for the similarity of attributes
from nebula.pipeline import SIMILARITY_WEIGHTS
# An interaction, whose value is a string specifying the type of interaction
from nebula.pipeline import INTERACTION
# These are the weights that iMDS gives on its dims; in this case topics
from nebula.pipeline import TOPIC_WEIGHTS
# These are the weights on each word for wLDA
#from nebula.pipeline import WORD_WEIGHTS




class TopicSimilarityModel(SimilarityModel):
    """
    Minor modifications to SimilarityModel so that it accepts document topics instead of doc attributes, and in general plays well with a TopicModel
    """
    def __init__(self, **kwargs):
        super(TopicSimilarityModel, self).__init__(**kwargs)
    
    params = {"low_dimensions": "Num Low Dimensions",
              "dist_func": "Distance Function"}

    def forward_input_reqs(self):
        """
        Overwrite doc attributes to doc topics.
        """
        return [DOC_TOPICS]
    
    
    def _update_documents(self, docs):
        """
        Doc attributes -> doc topics
        """
        #TODO: Nathan here. I didn't understand this part and it messed with my code so I commented it out. Seems to work now? Probably worth a closer look eventually.
        # If the documents are the same as last time, we don't need to
        # update, unless the weights changed
        # Kinda complicated currently, can I simplify this?
        #if len(self._docs) == len(docs):
        #    found = False
        #    for new_doc in docs:
        #        found = False
        #        for old_doc in self._docs:
        #            if new_doc[DOC_ID] == old_doc[DOC_ID]:
        #                found = True
        #                break
        #            
        #        if not found:
        #            break
        #    if not found:
        #        self._new_docs = True
        #else:
        #    self._new_docs = True
        #
        self._new_docs = True
        if self._new_docs:
            # Make a copy of the document ID's and high dimensional positions    
            self._docs = [{DOC_ID: x[DOC_ID], DOC_TOPICS: x[DOC_TOPICS]} for x in docs]
    
    def _vectorize(self, docs):
        """Forms a high dimensional position matrix and weight vector for the 
        documents based on their attribute mappings. The columns in the matrix
        correspond to the entries in the weight vector
        doc topics instead of doc attributes"""
        num_docs = len(docs)

        print("Vectorizing %s docs in SimiliarityModel"%num_docs)
        
        # Form the set of all attributes to form the matrix
        attributes = set()
        for doc in docs:
            for attr in doc[DOC_TOPICS]:
                attributes.add(attr)
                
        attribute_list = list(attributes)
        high_d = np.zeros((num_docs, len(attributes)), dtype=np.float64)
        
        # Fill in the highD matrix with the attribute values of the documents
        for i in range(num_docs):
            for j in range(len(attribute_list)):
                if attribute_list[j] in docs[i][DOC_TOPICS]:
                    high_d[i][j] = docs[i][DOC_TOPICS][attribute_list[j]]
        
        # If there is 0 variability, we will get nan's, and that's fine
        with np.errstate(divide="ignore", invalid="ignore"):
            # Calculate the zscore of the high D data, don't normalize
            high_d = zscore(high_d)
        
        # In case any dimensions have 0 variability
        high_d = np.nan_to_num(high_d)
        
        # Remove any weights no longer in the attributes
        for attr in list(self._weights.keys()):
            if attr not in attributes:
                del self._weights[attr]
                
        # Renormalize the remaining weights to 1
        sum = np.sum(list(self._weights.values()))
        if sum > 0:
            for attr in self._weights:
                self._weights[attr] /= sum
                
        # Make a list of weights to use for the distance calculation
        # The new set of weights should still sum to 1
        old_attribute_count = len(self._weights)
        print("Old count: %d, New count: %d" % (old_attribute_count, len(attribute_list)))
        print("Old weight sum: %f" % np.sum(list(self._weights.values())))
        weight_list = []
        for attr in attribute_list:
            if attr in self._weights:
                # Scale the old weights
                self._weights[attr] *= (float(old_attribute_count) / len(attribute_list))
            else:
                # Give new attributes a portion of the total weight
                new_weight = 1.0 / len(attribute_list)
                self._weights[attr] = new_weight
            weight_list.append((attr, self._weights[attr]))
                
        print("Weight sum: %f" % np.sum(list(self._weights.values())))
        
        return (high_d, weight_list)
    
    def _pairwise_distance(self, high_d):
        """Calculate an unweighted pairwise distance matrix for the high 
        dimensional positions."""
        num_docs = len(high_d)
        
        # Compute the pairwise distance of the high dimensional points
        pdist = np.zeros((num_docs, num_docs), dtype=np.float64)
        # Calculate the distance between every pair of points
        dist_func = euclidean
        if self.dist_func == "cosine":
            dist_func = cosine
        for i in range(0, num_docs - 1):
            for j in range(i + 1, num_docs):
                d = dist_func(high_d[i], high_d[j], np.repeat(1, len(high_d[i])))
                pdist[i][j] = d
                pdist[j][i] = d
                
        return pdist
        
    def forward(self, data):     
        if DOCUMENTS in data:
            print("Updating documents")
            self._update_documents(data[DOCUMENTS])
        else:
            # Set the documents to our last copy to continue the forward model
            data[DOCUMENTS] = [{DOC_ID: x[DOC_ID], DOC_TOPICS: x[DOC_TOPICS]} for x in self._docs]
        

        docs = self._docs
        num_docs = len(docs)
        
        # If we don't have any documents or we don't need to update, just return
        if num_docs == 0 or (not self._new_docs and not self._new_weights):
            return
        
        # _vectorize transforms DOC_TOPICS into a matrix where each row
        # is a document and each column is an attribute
        high_d, weight_list = self._vectorize(docs)
        
        # num_docs x num_docs matrix of distances between pairs of documents
        pdist = self._pairwise_distance(high_d)
        
        # Pass the similarity weights down the pipeline
        #if self._new_weights:
        data[SIMILARITY_WEIGHTS] = [{"id": x[0], "weight": x[1]} for x in weight_list]
        
        # We are updating now so make sure we only update again if we need to
        self._new_docs = self._new_weights = False
        if len(pdist) > 1:
            low_d = self._reduce(pdist, dimensions=self.low_dimensions)
        else:
            low_d = np.array([[0] * self.low_dimensions])
        
        low_d_max = low_d.max()
        low_d_min = low_d.min()
        if -low_d_min > low_d_max:
            low_d_max = -low_d_min
        if low_d_max == 0:
            low_d_max = 1
        
        # Set the low dimensional position of each document
        for i, pos in zip(range(len(data[DOCUMENTS])), low_d):
            doc = data[DOCUMENTS][i].copy()
            doc[LOWD_POSITION] = (pos / low_d_max).tolist()
            
            # Remember the high dimensional position of the point for inverse
            if DOC_TOPICS in doc:
                self._high_d[doc[DOC_ID]] = doc[DOC_TOPICS]
            
            data[DOCUMENTS][i] = doc

        
        
    def inverse(self, data):
        print('ts inverse called')
        interaction = data[INTERACTION]
        
        # If it's an OLI interaction, calculate a new set of weights based on
        # the selected set of points.
        if interaction == "oli":
            # data["points"] should be a dictionary containing the user-interacted
            # points, with the format
            # { DOC_ID: {
            #        "lowD": []
            #     },
            #    ...
            # }
            points = data["points"]
            
            # An update on less than 3 points is meaningless
            if len(points) < 3:
                return {}
            
            # Form the set of all attributes to form the matrix
            attributes = set()
            for p in list(points.keys()):
                if p in self._high_d:
                    attributes.update(list(self._high_d[p].keys()))
                else:
                    del points[p]
                    
            attributes = list(attributes)
            high_d_matrix = np.zeros((len(points), len(attributes)), dtype=np.float64)
            
            keys = list(points.keys())
            # Fill in the highD matrix with the attribute values of the documents
            # Creates a vector format of our high dimensional data, but the input
            # is different than what _vectorize expects
            i = 0
            for i in range(len(keys)): 
                for j in range(len(attributes)):
                    if attributes[j] in self._high_d[keys[i]]:
                        high_d_matrix[i][j] = self._high_d[keys[i]][attributes[j]]
            
            # Remove the dimensions with no variability
            high_d_matrix = np.array(high_d_matrix)
            print('high d mat')
            print(high_d_matrix)
            print('high d mat')
            num_dimensions = high_d_matrix.shape[1]
            keep_indeces = []
            for i in range(num_dimensions):
                if high_d_matrix[:,i].var() > 0:
                    keep_indeces.append(i)
                    
            for i in range(len(keys)):
                points[keys[i]]["highD"] = high_d_matrix[i][keep_indeces].tolist()
                
            high_dimensions = len(keep_indeces)
                
            request = {"points": points, 
                     "highDimensions": high_dimensions, 
                     "lowDimensions": self.low_dimensions,
                     "inverse": True,
                     "distanceFunc": self.dist_func
                     }
            request = json.dumps(request)
            
            # Start the Java process
            # THIS IS WHERE INVERSE MDS HAPPENS. If you want to modify the inverse MDS
            # algorithm, either change this Java code or put a Python version here
            # instead.
            proc = subprocess.Popen(['java', '-jar', os.path.join(__location__, 'java/mds.jar')],
                                    stdin=subprocess.PIPE, 
                                    stdout=subprocess.PIPE)
            
            # Submit the json request, read the result, and set the weights
            output = proc.communicate(request)[0]
            output = json.loads(output)
            
            weights = np.zeros((num_dimensions))
            weights[keep_indeces] = output["weights"]
            
            self._weights = {attributes[i]: weights[i] for i in range(num_dimensions)}

            self._new_weights = True

            #Attach it to data so that iLDA can get its hands on it.
            data[TOPIC_WEIGHTS] = self._weights

            #return {}