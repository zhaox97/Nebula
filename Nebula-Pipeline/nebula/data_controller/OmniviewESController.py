import json
import os

from nebula import pipeline

from elasticsearch import Elasticsearch


global TARGET_INDEX 
TARGET_INDEX = "test_index"

__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))
    
class OmniviewESController(pipeline.DataController):
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
            term = data["query"] ## search term
            result=None
            #===============================================
	    #with open('/data/bounds.json','r') as bounds:
	#	window = json.load(bounds)
	#	latt = window['latt']
	#	longt = window['longt']
	#	latt = [latt['gte'],latt['lte']]
	#	longt = [longt['gte'],longt['lte']]
	    if term != "":
         #      result= self.search_latlong(TARGET_INDEX, latt, longt, term)
          	result = self.search_TEXT(TARGET_INDEX, term)
	        hits=result['hits']['total']

            return_doc = []
            if hits != 0:
                ## return doc ID and doc raw text
                for text in result['hits']['hits']:
                     doc={pipeline.DOC_ID:text['_id'], pipeline.RAW_TEXT:text['_source']['text']}
                     return_doc.append(doc)

            return { pipeline.DOCUMENTS: return_doc}
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
    ##helper functions, uses ES API to search

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