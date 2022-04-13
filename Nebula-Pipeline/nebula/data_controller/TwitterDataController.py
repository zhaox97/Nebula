import json
import os
import time
import tweepy

#from nltk.corpus import stopwords
#from nltk.tokenize import RegexpTokenizer

from sklearn.feature_extraction.text import CountVectorizer
#from sklearn.feature_extraction.text import TfidfVectorizer

from nebula import pipeline
from .TextDataFunctions import preprocess



__location__ = os.path.realpath(
    os.path.join(os.getcwd(), os.path.dirname(__file__)))


class TwitterDataController(pipeline.DataController, tweepy.StreamListener):
    """Connects to Twitter to stream tweets based on certain filter words.
    
    An access token, access token secret, consumer key, and consumer secret
    must be provided in order to connect to the Twitter API. These can be
    created using instructions easily found on the web.
    
    As tweets are collected they are asynchronously pushed in chunks based 
    on two parameters:
    
    max_buffer: an integer that represents the maximum number of tweets that
    should be buffered before being pushed down the pipeline
    max_time: the maximum time, in seconds, that should elapse before any
    buffered tweets are sent down the pipeline
    """
    
    def __init__(self, access_token=None, access_token_secret=None, 
                 consumer_key=None, consumer_secret=None, 
                 max_buffer=1000, max_time=1):
        
        if not access_token or not access_token_secret or not consumer_key or not consumer_secret:
            raise RuntimeError("An access token, secret, consumer key, and consumer secret must be provided")
        
        # Store tweets until we flush them
        self._buffer = []
        self._last_flushed = 0
        self._max_buffer = max_buffer
        self._max_time = max_time
        
        # Maps tweet ID to the original tweet
        self._tweets = {}
        
        auth = tweepy.OAuthHandler(consumer_key, consumer_secret)
        auth.set_access_token(access_token, access_token_secret)
        
        self._blacklist = []
        with open(os.path.join(__location__, "nltkStopwords.txt")) as f:
            self._blacklist = f.read().splitlines()
        
        self._stream = tweepy.Stream(auth, self)
        
    def input_reqs(self):
        return set([pipeline.INTERACTION])
    
    def output(self):
        return set([pipeline.DOC_ID, pipeline.DOC_ATTRIBUTES])
   
    def on_data(self, data):
        """Here we redefined tweepy's on_data function to parse and process
        each individual tweet that comes in."""
        data = json.loads(data, encoding="unicode")
        
        if "id" not in data or "text" not in data:
            print("Tweet did not contain ID or text")
            return
        
        id = str(data["id"])
        tweet = data["text"].encode('utf-8')
        self._tweets[id] = tweet
        
        tweet = preprocess(tweet, self._blacklist)
        print("%s: %s" % (id, tweet))
        self._buffer.append((id, tweet))
        
        if len(self._buffer) > self._max_buffer or time.time() > (self._last_flushed + self._max_time):
            self._flush()
    
    def on_error(self, status):
        print(status)
        
    def _flush(self):
        """Empty the buffer, sending any currently stored tweets down the
        pipeline."""
        vectorizer = CountVectorizer()
        tweets = [x[1] for x in self._buffer]
        matrix = vectorizer.fit_transform(tweets).toarray()
        features = vectorizer.get_feature_names()
        
        docs = []
        for i in range(len(self._buffer)):
            tweet = self._buffer[i]
            row = matrix[i]
            
            doc = {pipeline.DOC_ID: tweet[0]}
            attributes = {}
            for i in range(len(row)):
                if row[i] > 0:
                    attributes[features[i]] = float(row[i])
                        
            doc[pipeline.DOC_ATTRIBUTES] = attributes
            docs.append(doc)
            
        self._buffer = []
        self._last_flushed = time.time()
        # Create the data blob with the tweet data and push it down the pipeline
        self.push({pipeline.DOCUMENTS: docs})
        
    def get(self, data):
        """Accepts one request:
        
        "raw" returns the raw tweet based on its "id"
        """
  
        if "type" not in data:
            return None
        
        req_type = data["type"]
        if req_type == "raw":
            if "id" in data:
                id = data["id"]
                if id in self._tweets:
                    data["value"] = self._tweets[id]
                    return data
                
        return None
    
    def run(self, data):
        """Checks for a "tweet_filter" interaction that sets the current filter
        to a string of words found in "filter". This string represents a list
        of words that are each searched for individually, and any tweet 
        containing any of these words could be found."""
        
        # Check to see if we have a tweet filter interaction
        if pipeline.INTERACTION in data:
            if data[pipeline.INTERACTION] == "tweet_filter":
                filter = data["filter"].split()
                self._stream.disconnect()
                self._stream.filter(track=filter, languages=['en'], async=True)
                print("Setting filter to: ")
                print(filter)
            elif data[pipeline.INTERACTION] == "tweet_stop":
                self._stream.disconnect()
        return {}