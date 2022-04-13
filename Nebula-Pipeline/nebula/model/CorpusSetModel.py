# -*- coding: utf-8 -*-
# FILE NO LONGER IN USE??


#import copy
#import itertools
#import json
#import math
import os
#import re
#import subprocess
#import sys

#from pprint import pprint

#import numpy as np
#from sklearn.manifold import MDS
#from scipy.stats.mstats import zscore

import nebula.pipeline as pipeline

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
#from nebula.pipeline import LOWD_POSITION
# The relevance of each document within the list
#from nebula.pipeline import DOC_RELEVANCE
# A set of attribute names that exist in the data
from nebula.pipeline import ATTRIBUTES
# A dictionary of attribute weights
from nebula.pipeline import ATTRIBUTE_RELEVANCE
# A dictionary of attribute weight deltas from the most recent interaction
from nebula.pipeline import ATTRIBUTE_RELEVANCE_DELTA
# A list of weights for the similarity of attributes
#from nebula.pipeline import SIMILARITY_WEIGHTS
# An interaction, whose value is a string specifying the type of interaction
#from nebula.pipeline import INTERACTION

#from nebula.pipeline import VIEW
#from nebula.pipeline import ATTRIBUTE_LIST
#from nebula.pipeline import DOCUMENTS_LIST
#from nebula.pipeline import ATTRIBUTE_ID
#from nebula.pipeline import ATTRIBUTE_DOCS



class CorpusSetModel(pipeline.AsyncModel):
    params = {"corpus_push_limit": "Corpus push limit",
              "corpus_limit": "Total corpus limit"}
    
    def __init__(self, corpus_push_limit=1000, corpus_limit=1000000):
        # The limit of how many new documents to send forward
        self.corpus_push_limit = corpus_push_limit
        
        # The limit of how many documents to maintain in the corpus
        self.corpus_limit = corpus_limit
        
        self._corpus_set = {}
        self._attr_weights = {}
        self._attr_weights_delta = {}
        self._attributes = set()
    
    def forward_input_args(self):
        return [DOC_ATTRIBUTES]
    
    def inverse_input_reqs(self):
        return [ATTRIBUTE_RELEVANCE_DELTA]
    
    def setup(self, data):        
        if ATTRIBUTES in data:
            self._attributes.update(data[ATTRIBUTES])
        
        if DOCUMENTS in data:
            for doc in data[DOCUMENTS]:
                self._corpus_set[doc[DOC_ID]] = doc
                for attr in doc[DOC_ATTRIBUTES]:
                    self._attributes.add(attr)
            del data[DOCUMENTS] 
            
        data[ATTRIBUTES] = self._attributes
    
    def forward(self, data):
        if ATTRIBUTES in data:
            self._attributes.update(data[ATTRIBUTES])
               
        if DOCUMENTS in data:
            for doc in data[DOCUMENTS]:
                self._corpus_set[doc[DOC_ID]] = doc
                for attr in doc[DOC_ATTRIBUTES]:
                    self._attributes.add(attr)
                    
        # Send a new set of attributes down the pipeline
        data[ATTRIBUTES] = self._attributes
                
        # Calculate the relevance for each candidate
        new_relevances = []
        for doc_id in self._corpus_set:
            relevance = self._relevance(self._corpus_set[doc_id], self._attr_weights_delta)
            if relevance > 0:
                # Only worry about documents with a positive relevance
                new_relevances.append((doc_id, relevance))
            
        new_relevances = sorted(new_relevances, key=lambda x: x[1], reverse=True)
        
        # Limit the number of new documents that will appear
        limit = len(new_relevances)
        if self.corpus_push_limit < limit:
            limit = self.corpus_push_limit
            
        new_docs = []
        for i in range(limit):
            doc_id = new_relevances[i][0]
            new_docs.append(self._corpus_set[doc_id])
            
        data[DOCUMENTS] = new_docs
        
    def inverse(self, data):
        if ATTRIBUTE_RELEVANCE in data:
            self._attr_weights = data[ATTRIBUTE_RELEVANCE]
        
        if ATTRIBUTE_RELEVANCE_DELTA in data:
            self._attr_weights_delta = data[ATTRIBUTE_RELEVANCE_DELTA]
        else:
            self._attr_weights_delta = {}
        
    def _relevance(self, doc, weights):
        relevance = 0
        for attr, value in doc[DOC_ATTRIBUTES].items():
            if attr in weights:
                relevance += weights[attr] * value

        return relevance
        
    def reset(self):
        self._corpus_set = {}
        self._attr_weights = {}
        self._attr_weights_delta = {}
        self._attributes = set()
