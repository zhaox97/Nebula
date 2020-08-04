# -*- coding: utf-8 -*-
import itertools
import os


import numpy as np


__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))

# The list of documents passed through the forward pipeline
from nebula.pipeline import DOCUMENTS
# The ID of each document with the document list
from nebula.pipeline import DOC_ID
# The high dimensional position of each document within the list
#from nebula.pipeline import HIGHD_POSITION
# A map of attributes for a document. Alternative way of storing position
from nebula.pipeline import DOC_ATTRIBUTES
# The low dimensional position of each document within the list
from nebula.pipeline import LOWD_POSITION
# A list of weights for the similarity of attributes
from nebula.pipeline import SIMILARITY_WEIGHTS


from SimilarityModel import SimilarityModel
from DistanceFunctions import euclidean, cosine




def one_minus(high_d_matrix):
        matrix = np.array(high_d_matrix)
        
        # First normalize the matrix by it's max value
        matrix = matrix / matrix.max()
        
        # Now take the 1 minus value
        matrix = 1 - matrix
        
        return matrix



class CompositeModel(SimilarityModel):
    """Calculate a composite pairwise distance matrix to visualize the
    attributes with the data points."""
    
    def __init__(self, vd_dist=one_minus, **kwargs):
        super(CompositeModel, self).__init__(**kwargs)
        self._vd_dist_func = vd_dist
    
    def forward(self, data):
        if DOCUMENTS in data:
            self._update_documents(data[DOCUMENTS])
        else:
            # Set the documents to our last copy to continue the forward model
            data[DOCUMENTS] = [{DOC_ID: x[DOC_ID], DOC_ATTRIBUTES: x[DOC_ATTRIBUTES]} for x in self._docs]
        
        docs = self._docs
        num_docs = len(docs)
        
        # If we don't have any documents or we don't need to update, just return
        if num_docs == 0 or (not self._new_docs and not self._new_weights):
            return
        
        high_d, weight_list = self._vectorize(docs)
        pdist = self._pairwise_distance(high_d, weight_list)
        
        # Pass the similarity weights down the pipeline
        #if self._new_weights:
        data[SIMILARITY_WEIGHTS] = [{"id": x[0], "weight": x[1]} for x in weight_list]
        
        # We are updating now so make sure we only update again if we need to
        self._new_docs = self._new_weights = False
        
        if len(pdist) <= 1:
            low_d = np.array([[0] * self.low_dimensions])
        else:
            # Only include the top 10 attributes
            cutoff = 0
            if len(weight_list) > 10:
                cutoff = sorted(weight_list, key=lambda x: x[1], reverse=True)[10][1]
                
            indices = np.where(np.array(map(lambda x: x[1], weight_list)) > cutoff)[0]
            
            if len(indices) != 0:
                # Form a high D matrix with only the included attributes
                sub_high_d = np.array(high_d)[:, indices]
                
                # Normalize the high dimensional matrix by column
                sub_high_d = sub_high_d / sub_high_d.max(0)
                    
                # Add a document entry for each attribute we want to show
                for index in indices:
                    data[DOCUMENTS].append({DOC_ID: weight_list[index][0], "type": "attribute"})
                    
                # Calculate the DV matrix from our dist func
                dv_matrix = np.array(self._vd_dist_func(sub_high_d))
                
                # The VD matrix is just the transpose
                vd_matrix = np.transpose(dv_matrix)
                
                sub_high_d_transposed = sub_high_d.transpose()
                num_attributes = len(sub_high_d_transposed)
                num_docs = len(sub_high_d)
                # Compute the pairwise distance of the high dimensional points
                vv_matrix = np.zeros((num_attributes, num_attributes), dtype=np.float64)
                
                weights = np.full((num_docs), 1.0 / num_docs)
                
                # Calculate the distance between every pair of attributes
                for i in xrange(0, num_attributes - 1):
                    for j in xrange(i + 1, num_attributes):
                        d = cosine(sub_high_d_transposed[i], sub_high_d_transposed[j], weights)
                        vv_matrix[i][j] = d
                        vv_matrix[j][i] = d
                        
                # Do something to balance the weights of the four pieces
                dd_weight = pdist.mean()
                dv_weight = dv_matrix.mean()
                vv_weight = vv_matrix.mean()
                
                max_weight = np.array([dd_weight, dv_weight, vv_weight]).max()
                
                pdist *= (max_weight / dd_weight)
                dv_matrix *= (max_weight / dv_weight)
                vd_matrix *= (max_weight / dv_weight)
                vv_matrix *= (max_weight / vv_weight)
                
                # Compose matrices together
                composite_matrix = np.vstack((np.array(pdist), vd_matrix))
                composite_matrix = np.hstack((composite_matrix, np.vstack((dv_matrix, vv_matrix))))
                composite_matrix = np.nan_to_num(composite_matrix)
                
            else:
                composite_matrix = pdist
            
            low_d = self._reduce(composite_matrix, dimensions=self.low_dimensions)
            low_d_max = low_d.max()
            low_d_min = low_d.min()
            if -low_d_min > low_d_max:
                low_d_max = -low_d_min
            if low_d_max == 0:
                low_d_max = 1
            
            # Set the low dimensional position of each document
            for i, pos in itertools.izip(xrange(len(data[DOCUMENTS])), low_d):
                doc = data[DOCUMENTS][i].copy()
                doc[LOWD_POSITION] = (pos / low_d_max).tolist()
                
                # Remember the high dimensional position of the point for inverse
                if DOC_ATTRIBUTES in doc:
                    self._high_d[doc[DOC_ID]] = doc[DOC_ATTRIBUTES]
                
                data[DOCUMENTS][i] = doc
