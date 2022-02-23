import json
import os
import time
import random
import numpy as np

#from nltk.corpus import stopwords
#from nltk.tokenize import RegexpTokenizer

#from sklearn.feature_extraction.text import CountVectorizer
from sklearn.feature_extraction.text import TfidfVectorizer

from nebula import pipeline
from .TextDataFunctions import preprocess

from elasticsearch import Elasticsearch


global TARGET_INDEX 
TARGET_INDEX = "test_index"

__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))


class ESController(pipeline.DataController):
    """Elasticsearch data controller"""
    
    def __init__(self):
        #elastic search initialization
        self._es = Elasticsearch([{'host': '127.0.0.1', 'port': 9200}])
                
    def input_reqs(self):
        return set([pipeline.INTERACTION])
    
    # keys in datablock
    def output(self):
        #returning ID and raw text
        return set([pipeline.DOC_ID, pipeline.RAW_TEXT, pipeline.HIGHD_POSITION])
            
    def get(self, args):
        """Accepts two requests:
        
        "attributes" returns a list of attribute names for the underlying data
        "raw" returns the raw text for a single document based on an "id"
        """
      
        if "type" not in args:
            return None
        
        req_type = args["type"]
        
        # return doc with that ID
        if req_type == "raw":
            result= self.search_ID(TARGET_INDEX, args["id"])
            args["value"]=result['_source']['text']
            return args
        return None
            
    def run(self, data): 
        ##this function will ran whenever socket received update request
        
        ##if update request is search, this will do a search from ES and return docs
        if pipeline.INTERACTION in data and data[pipeline.INTERACTION] == "search":
            hits = 0 ## number of documents hit
            
	    # Otherwise use the search term to bring in new documents
            searchquery = data["query"] ## search term
	    
	    terms = searchquery.encode('utf-8').split(' ')
	    if len(terms) == 1:
		term = terms[0]

	        result=None
	        if term == "random":
		    #Exectures random search if 'random' keyword is entered'
		    result = self.search_RANDOM(TARGET_INDEX, 10)
		    hits=result['hits']['total']
                elif term != "":
                    result= self.search_TEXT(TARGET_INDEX, term)
                    hits=result['hits']['total']

                return_doc = []
                if hits != 0:
                    ## return doc ID and doc raw text
                    for text in result['hits']['hits']:
                        doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                        return_doc.append(doc)

                return { pipeline.DOCUMENTS: return_doc}
            #Multiple search query terms starts a transitive search
	    else:
	        return self.transitive(terms)

	
	if pipeline.INTERACTION in data and data[pipeline.INTERACTION] == "oli":
		attrs = pipeline.Model.global_weight_vector
		sortedkeys = sorted(attrs, key=attrs.get)
		
		hits = 0
		result = None
		
		#MLT Query
		#result = self.search_MLT(TARGET_INDEX, sorted(data["points"], key=data["points"].get))
                #hits = result[u'hits'][u'total']

		#TERM Query
		terms = sortedkeys[-5:]
		# maxterm = sortedkeys[-1]	
		if len(terms) != 0:
			result = self.search_BOOL(TARGET_INDEX, terms, 3, 10)
			hits = result['hits']['total']
		
		return_doc = []
		if hits != 0:
			for text in result['hits']['hits']:
				doc = {pipeline.DOC_ID: text['_id'], pipeline.RAW_TEXT: text['_source']['text']}
				return_doc.append(doc)
		return { pipeline.DOCUMENTS: return_doc }
		
	## if interaction is Omniview, this will do a lattlongt search and return documents
        if pipeline.INTERACTION in data and data[pipeline.INTERACTION] == "omniview":
            print("================     Omniview INTERACTION  ==============")
            latt=[]
            longt =[]
            term = data["query"]
            ##read in lattlongt bounds
            with open('/data/bounds.json','r') as bounds:
                  window = json.load(bounds)
                  latt = window["latt"]
                  longt = window["longt"]

                  latt = [latt["gte"],latt["lte"]]
                  longt = [longt["gte"],longt["lte"]]
            result = self.search_latlong(TARGET_INDEX, latt, longt, term)
            hits=result['hits']['total']
            print("================     Omniview result:" + str(hits))  
            return_doc=[]
            if hits != 0:
                ## return doc ID and raw text
                for text in result['hits']['hits']:
                    doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                    return_doc.append(doc)
                print("searching" + str(latt) + str(longt))
                return { pipeline.DOCUMENTS: return_doc}
        # if the update request is update relavence, this will up-weight terms 
        if pipeline.INTERACTION in data and data[pipeline.INTERACTION] == "change_relevance":
            if "query" not in data:
		return {}
	    term = data["query"]
            # do a or search
            result = self.search_OR(TARGET_INDEX, term)
            hits=result['hits']['total']

            #initialize return_doc. If hits=0, return empty list
            return_doc = []
            if hits != 0:
                print('hits: ', hits)

                for text in result['hits']['hits']:
                     doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                     return_doc.append(doc)
                return { pipeline.DOCUMENTS: return_doc}

        ##default return
        return {}

    ##Transitive Search for PI
    def transitive(self, terms):

	result=None
	all_terms = terms
	print(('Intial Terms: ' + str(terms)))
	for i in range(3):
	    #Search with current terms
	    result = self.search_BOOL(TARGET_INDEX, terms, len(terms), 10)
	
	    #If there are no documents returned break out of loop
	    if len(result['hits']['hits']) == 0:
		break
		
	    #Get list of clean texts
	    texts = []
	    for text in result['hits']['hits']:
	        doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
	        clean_text = preprocess(doc[pipeline.RAW_TEXT].encode('utf-8'), ['\xc2', 'sa', 'said'], remove_ints=True)	    
		texts.append(clean_text)

	    #Create TFIDF vectorizer
	    vectorizer = TfidfVectorizer()
	    temp = vectorizer.fit_transform(texts)

	    #Get vocab from TFIDF matrix
	    vocab = vectorizer.get_feature_names()

	    #Sum up columns of array 
	    tfidf_sums = np.sum(temp.todense(), axis=0).tolist()[0]
	    #Zip values with the associated term
	    terms = list(zip(vocab, tfidf_sums))

	    #Sort the list by value and get the N highest terms
	    new_words = [a for (a,b) in sorted(terms, key=lambda x: x[1]) if a not in all_terms][-5:]
	    all_terms += new_words
	    terms = new_words
		    
	print(("Final terms: " + str(all_terms)))
		
	#Search with new term set
	result = self.search_BOOL(TARGET_INDEX, all_terms, len(all_terms) / 4, 50)
	return_doc = []
	hits = result['hits']['total']
	print(('Final hits: ' + str(hits)))
	if hits != 0:
            for text in result['hits']['hits']:
                doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                return_doc.append(doc)

	#If no docs are returned, do regular term search
	if len(return_doc) != 0:
	    random.shuffle(return_doc)
	    return { pipeline.DOCUMENTS: return_doc[:10] }
        else:
	    result=None
	    hits=0

            if searchquery == "random":
                #Exectures random search if 'random' keyword is entered'
                result = self.search_RANDOM(TARGET_INDEX, 10)
                hits=result['hits']['total']
            elif searchquery != "":
                result= self.search_TEXT(TARGET_INDEX, searchquery)
                hits=result['hits']['total']

                return_doc = []
                if hits != 0:
                    ## return doc ID and doc raw text
                    for text in result['hits']['hits']:
                        doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                        return_doc.append(doc)

                return { pipeline.DOCUMENTS: return_doc}
        

    ##helper functions, uses ES API to search

    #Takes a set of document IDs and returns those documents
    def search_SET(self, target_index, docset):
	BODY = {
	     "query": {
		"ids": {
		     "values": [str(s) for s in docset]
		}
	     }
	}
	result = self._es.search(index=target_index, body=BODY, size=10)
	return result

    #Bool based term query, 
    def search_BOOL(self, target_index, terms, should_match=0, docs_wanted=10):
	arr = []
	i = 1
	for term in terms:
		should = {
			"match": { 
				"text": {
					"query": term,
 					"boost": float(i)
				}
			}
		}
		arr.append(should)
             	#i = i + 1.0

	BODY = {"query": {
			"bool": {
				#"must": [
				#	{ "match": { "text": terms[-1] }}
				#],
				"should": arr,
				"minimum_should_match": should_match
			}	
		}
	}
	result = self._es.search(index=target_index, body=BODY, size=docs_wanted)
	return result

    #documents based more like this query
    def search_MLT(self, target_index, docs):
	arr = []
	for doc in docs:
		like = {
			"_index": "test_index",
			"_type": "lattlong",
			"_id": doc
		}
		arr.append(like)

	BODY = {
		"query": {
			"more_like_this": {
				"fields": ["text"],
				"like": arr,
				"max_query_terms": 10,
				"minimum_should_match": 5,
				"boost_terms": 1
			}
		}
	}
        result = self._es.search(index=target_index, body=BODY, size=10)
        return result

    ##random scoring query
    def search_RANDOM(self, target_index, size):
	print("SEARCHING RANDOM ------");
	BODY = {
		"query": {
			"function_score": {
				"functions": [
					{
						"random_score": {
							"seed": int(time.time())
						}
					}
				]
			}
		}
	}
        result = self._es.search(index=target_index, body=BODY, size=size)
        return result

    ##search with document ID (used for clicking dots)
    def search_ID(self, target_index, target):
        print("=======================>     searching Document ID: " + target)
        result= self._es.get(index=target_index, id=target)
        return result

    ##search with terms (used for search button)
    def search_TEXT(self, target_index, target):
        print("=======================>     searching keyword: " + target)
        result= self._es.search(index=target_index, body={"query": {"match" : { "text" : target }}})
        return result
    
    ##search with OR boolean (when update relavence)
    def search_OR(self, target_index, target):
        BODY = {"query":{
                "match": {
                    "text": {
                        "query": target,
                        ## return documents that match at least 60% of matching
                        "minimum_should_match": "60%"
                    }
                }
        }}
        
        result = self._es.search(index=target_index, body=BODY)
        return result
    
    ## searching lattlongt for Omniview
    def search_latlong(self, target_index, latt, longt, target):
        if target != "":
            BODY={
                "size": 1000,
                'query': {
                'bool': {
                'must': [
                    {
                    'range':{
                        'latt' : {
                            'gte' : latt[0],
                            'lte' : latt[1]}
                            }},
                    {'range':{
                        'longt' : {
                            'gte' : longt[0],
                            'lte' : longt[1]}
                            }}
                            ,
                    {'match': 
                       { 'text' : target }}
                        ]
                }}}
        else:
            BODY={
                "size": 1000,
                'query': {
                'bool': {
                'must': [
                    {
                    'range':{
                        'latt' : {
                            'gte' : latt[0],
                            'lte' : latt[1]}
                            }},
                    {'range':{
                        'longt' : {
                            'gte' : longt[0],
                            'lte' : longt[1]}
                            }}]
                }}}
        result= self._es.search(index=target_index, body=BODY)
        return result