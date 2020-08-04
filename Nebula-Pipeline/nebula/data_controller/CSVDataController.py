import csv
import os
import re

from nebula import pipeline


__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))



class CSVDataController(pipeline.DataController):
    """This basic implementation of a data controller implements basic text
    queries for new documents. It loads a CSV file of data and compares text
    searches to the document names and puts all matching documents in the
    working set. It also accesses the raw data through the raw_folder
    argument, which should have a file named <id>.txt for each document
    ID in the CSV file.
    
    csvfile: the filename of the CSV file to load
    raw_folder: the folder name of the folder containing the raw documents
    """
    
    def __init__(self, csvfile, raw_folder=None):
        self._documents = []
        self._columns = []
        self._attributes = {}
        self._raw_folder = raw_folder
        
        with open(csvfile, "rU") as f:
            reader = csv.reader(f)
            self._columns = reader.next()[1:]
            for i in range(len(self._columns)):
                self._attributes[self._columns[i]] = i

            # This is a workaround to allow us to parse files from Windows OS
            # Their line terminators or EOF makes open think that there's an
            # extra, blank line at the end of the file. We just need to skip it
            numCols = -1   
            for line in reader:
                if numCols == -1:
                        numCols = len(line)
                if len(line) == numCols:
                    doc = {}
                    doc[pipeline.DOC_ID] = line[0]
                    doc[pipeline.HIGHD_POSITION] = [float(x) for x in line[1:]]
                    doc[pipeline.DOC_ATTRIBUTES] = {self._columns[i]: float(line[i+1]) for i in xrange(len(self._columns))}
                    self._documents.append(doc)
                
        max_attributes = {}
        for doc in self._documents:
            for attr, value in doc[pipeline.DOC_ATTRIBUTES].iteritems():
                if attr not in max_attributes or value > max_attributes[attr]:
                    max_attributes[attr] = value
                    
        for doc in self._documents:
            for attr in doc[pipeline.DOC_ATTRIBUTES]:
                if max_attributes[attr] > 0:
                    doc[pipeline.DOC_ATTRIBUTES][attr] /= max_attributes[attr]
          
    def input_reqs(self):
        return set([pipeline.INTERACTION])
       
    def output(self):
        return set([pipeline.DOC_ID, pipeline.HIGHD_POSITION, pipeline.DOC_ATTRIBUTES, pipeline.ATTRIBUTES])
            
    def get(self, args):
        """Accepts two requests:
        
        "attributes" returns a list of attribute names for the underlying data
        "raw" returns the raw text for a single document based on an "id"
        """
        
        if "type" not in args:
            return None
        
        req_type = args["type"]
        if req_type == "attributes":
            if "id" in args:
                for doc in self._documents:
                    if doc[pipeline.DOC_ID] == args["id"]:
                        args["value"] = doc[pipeline.DOC_ATTRIBUTES]
                        return args
            else:
                args["value"] = self._columns
                return args
            
        elif req_type == "raw" and self._raw_folder:
            for doc in self._documents:
                if doc[pipeline.DOC_ID] == args["id"]:
                    with open(os.path.join(self._raw_folder, args["id"] + ".txt"), "r") as f:
                        args["value"] = f.read()
                        return args
                  
        return None

    def setup(self, data):
        """Passes the attribute mapping and document list down the setup."""
        data[pipeline.ATTRIBUTES] = self._attributes
        data[pipeline.DOCUMENTS] = self._documents
            
    def run(self, data):
        """Searches for new documents based on two methods. If a set of
        attribute weights are found, those are used to find the most relevant
        documents to return. Otherwise, if a search query is found, that query
        is used to find a regex match against any documents. This all should
        be redundant since all documents are passed down upon load to a presumed
        relevance based model, such as the ActiveSetModel."""
        
        search_relevance = {}
      
        if pipeline.ATTRIBUTE_RELEVANCE in data:
            # It's an attribute search, so use the weighted attributes to find
            # documents to send down
            for attr in data[pipeline.ATTRIBUTE_RELEVANCE]:
                weight = data[pipeline.ATTRIBUTE_RELEVANCE][attr]
                if weight > 0 and attr in self._attributes:
                    search_relevance[attr] = weight
                    
        elif pipeline.INTERACTION in data and data[pipeline.INTERACTION] == "search":
            term = data["query"]
            prog = re.compile(term, flags=re.IGNORECASE)
            
            for attr in self._attributes:
                if prog.search(attr):
                    # Give each matching attribute a weight of one, so 
                    # documents with that term will be sent down
                    search_relevance[attr] = 1
                    
        if len(search_relevance) == 0:
            return {}    
                   
        return_documents = []
        for doc in self._documents:
            relevance = self._relevance(doc, search_relevance)
            if relevance > 0:
                return_documents.append(doc)
        
        return { pipeline.DOCUMENTS: return_documents }
            
    def _relevance(self, doc, attr_weights):
        """Calculates the relevance for a single document."""
        
        relevance = 0
        for attr in attr_weights:
            attr_val = doc[pipeline.HIGHD_POSITION][self._attributes[attr]]
            relevance += attr_weights[attr] * attr_val
       
        return relevance
