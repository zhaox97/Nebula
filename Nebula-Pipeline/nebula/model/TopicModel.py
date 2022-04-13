# -*- coding: utf-8 -*-
import itertools
import os

import numpy as np
from sklearn.decomposition import LatentDirichletAllocation
from scipy.stats import entropy

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
# A map of topics for a document. The new way to store position
from nebula.pipeline import DOC_TOPICS
# The low dimensional position of each document within the list
#from nebula.pipeline import LOWD_POSITION
# The relevance of each document within the list
#from nebula.pipeline import DOC_RELEVANCE
# A set of attribute names that exist in the data
#from nebula.pipeline import ATTRIBUTES
# A dictionary of attribute weights
#from nebula.pipeline import ATTRIBUTE_RELEVANCE
# A dictionary of attribute weight deltas from the most recent interaction
#from nebula.pipeline import ATTRIBUTE_RELEVANCE_DELTA
# A list of weights for the similarity of attributes
#from nebula.pipeline import SIMILARITY_WEIGHTS
# An interaction, whose value is a string specifying the type of interaction
from nebula.pipeline import INTERACTION
# These are the weights that iMDS gives on its dims; in this case topics
from nebula.pipeline import TOPIC_WEIGHTS
# These are the weights on each word for wLDA
#from nebula.pipeline import WORD_WEIGHTS




class TopicModel(pipeline.Model):
    """A topic model contains information about the topic content of docs.
    It takes in a term frequency matrix and outputs a topic mixture matrix.
    """
    
    params = {"topics": "Num of Topics"}
    
    def __init__(self, topics = 10):
        self.topics = topics

        self._docs = []
        self._new_docs = False
        self._lda = None
        self._word_weights = np.array([])
        self._high_d = {}
        self._new_weights = False
        self._first_time = True
        self._vocab = []
        self._last_BETA = None

        self._max_wordcloud_size = 50
        self._num_topic_words = 5
        self._SIZE_THRESH = 10

        self._colors = ['red', 'blue', 'green', 'orange', 'purple', 'black',  'violet', 'brown', 'teal', 'maroon', 'grey',  'pink']

    def forward_input_reqs(self):
        return [DOC_ATTRIBUTES]
    
    def forward_output(self):
        return [DOC_TOPICS]
    
    def inverse_input_reqs(self):
        return []
    
    def setup(self, data):
        # Store all the documents at the start
        #if DOCUMENTS in data:
        #    self._update_documents(data[DOCUMENTS])
        self.forward(data)

        
    
    def _update_documents(self, docs):
        # If the documents are the same as last time, we don't need to
        # update, unless the weights changed
        # Kinda complicated currently, can I simplify this?
        if len(self._docs) == len(docs):
            found = False
            for new_doc in docs:
                found = False
                for old_doc in self._docs:
                    if new_doc[DOC_ID] == old_doc[DOC_ID]:
                        found = True
                        break
                    
                if not found:
                    break
            if not found:
                self._new_docs = True
        else:
            self._new_docs = True
        
        if self._new_docs:
            # Make a copy of the document ID's and high dimensional positions    
            self._docs = [{DOC_ID: x[DOC_ID], DOC_ATTRIBUTES: x[DOC_ATTRIBUTES]} for x in docs]
    
    def _vectorize(self, docs):
        """Forms a high dimensional position matrix and weight vector for the 
        documents based on their attribute mappings. The columns in the matrix
        correspond to the entries in the weight vector"""
        num_docs = len(docs)
        
        # Form the set of all attributes to form the matrix
        attributes = set()
        for doc in docs:
            for attr in doc[DOC_ATTRIBUTES]:
                attributes.add(attr)
                
        attribute_list = list(self._vocab) + list(set(attributes).difference(set(self._vocab)))
        high_d = np.zeros((num_docs, len(attribute_list)), dtype=np.float64)
        
        # Fill in the highD matrix with the attribute values of the documents
        for i in range(num_docs):
            for j in range(len(attribute_list)):
                if attribute_list[j] in docs[i][DOC_ATTRIBUTES]:
                    update = docs[i][DOC_ATTRIBUTES][attribute_list[j]]
                    high_d[i][j] = update
        
        self._vocab = attribute_list
        return high_d
    
    def _reduce(self, tf, topics, n_init = 1):
        """Run LDA on the document distribution. If you want to alter the forward 
        topic algo, do it here!"""
        best_score = np.float('-inf')
        result = None
        self.K = topics
        
        tf = np.array(tf)


        np.random.seed(123)

        #Fill any words for which we don't yet have weights. By default, weigh by inverse document frequency
        old_V = len(self._word_weights)
        new_V = tf.shape[1]
        if old_V < new_V:
            #print "Using iDF weighting"
            doc_counts = np.sum(np.vectorize(lambda x: x > 0)(tf[:, old_V:]), axis = 0)
            doc_frequency = doc_counts / float(tf.shape[0])
            idf = np.log(1.0 / doc_frequency + 1)

            #Normalize the new weights so they don't overwhelm the old ones.
            idf = (0.001 + idf / np.sum(idf)) * (new_V - old_V)
            
            #Normalize wieghts so that they're between 0 and V
            self._word_weights = np.array(list(self._word_weights / np.sum(self._word_weights) * old_V)  + list(idf))
            
        print('Our top 10 weighted words for topic formation:')
        print(list(zip(np.array(self._vocab)[np.argsort(-self._word_weights)][:10], np.sort(-self._word_weights)[:10])))

        np.random.seed(123)

        #If we've not yet done LDA:
        #Do LDA a couple times and take the one that's best in some sense.
        #print 'Making an LDA from scratch!'
        for i in range(n_init):
            lda = LatentDirichletAllocation(n_topics = topics, learning_method = 'batch', max_iter = 1000)
            lda.fit(np.array(tf), weights = self._word_weights)
            current_score = lda.score(tf)
            if current_score > best_score:
                best_score = current_score
                result = lda.transform(tf, weights = self._word_weights)
                self._lda = lda

        #Now let's make this into a list of rows.
        ret = [result[i,:] for i in range(result.shape[0])]

        #If we already have topics, let's try to recover the lables in the correct order
        if self._last_BETA is not None:
            BETA_1 = self._lda.components_[:, :old_V]
            BETA_1 = BETA_1 / np.sum(BETA_1, axis = 1)[:, np.newaxis]

            BETA_2 = self._last_BETA
            BETA_2 = BETA_2 / np.sum(BETA_2, axis = 1)[:, np.newaxis]

            #Symmetrized KL divergence (the scipy entropy function gives KL div if passed 2 args)
            dist = lambda x1, x2: entropy(x1, x2) + entropy(x2, x1)

            #Greedy solution to label switching
            used_ones = []
            for k in range(topics):
                b1 = BETA_1[k,:]
                min_dist = np.float('inf')
                best_match = None
                for k1 in list(set(range(topics)).difference(set(used_ones))):
                    b2 = BETA_2[k1,:]
                    d = dist(b1, b2)
                    if d < min_dist:
                        min_dist = d
                        best_match = k1
                used_ones.append(best_match)

            #Store the BETA in the new order
            self._last_BETA = self._lda.components_[used_ones,:]

            #Reorder the doc topics
            ret = [tops[used_ones] for tops in ret]
        else:
            self._last_BETA = self._lda.components_

        return ret
        
    def _get_induced_weights(self, topic_weights):
        """
        Get weights on words induced by weights on topics.
        """
        weight_vector = np.array([topic_weights['Topic %i'%i] for i in range(len(topic_weights))])
        word_weights = self._lda.get_induced_weights(weight_vector)

        #normalize all weights to be less than equal to 1. use logs for floating point issues.
        #word_weights = word_weights / np.max(word_weights)
        #word_weights = np.exp(np.log(word_weights) - np.log(0.01*np.max(word_weights))) + 0.1
        word_weights = word_weights / np.sum(word_weights) * len(word_weights)

        return(word_weights)

    def get_top_topic_words(self, k):
        """
        Gets the top k words associated with each topic.
        A wrapper for the LDA function of the same name.

        Also gets size/color for frontend display
        """
        top_words = self._lda.get_top_topic_words(k, self._vocab)

        #Make the dict to send to the frontend
        to_send = [{'text' : x['word'], 'regular_size' : x['topic_rel'], 'diff_size' : x['topic_rel'] / (x['corpus_rel'] - x['topic_rel']), 'color' : self._colors[x['topic']], 'id' : i} for i,x in enumerate(top_words)]
        
        ##If the user has interacted, let's show those weights instead
        #for x in to_send:
        #    if self._word_weights is not None:
        #        x['size'] = np.sqrt(self._word_weights[self._vocab.index(x['text'])])

        #Resize the weights to a reasonable size.
        #TODO: Maybe this belongs on the frontend somewhere?
        #size_keys = ['regular', 'diff']
        #max_size = dict([(key, max([x['size'][key] for x in to_send])) for key in size_keys])
        #for x in to_send:
        #    for key in x['size'].keys():
        #        x['size'][key] = self._max_wordcloud_size * x['size'][key] / max_size[key]
        #        if x['size'][key] < self._SIZE_THRESH:
        #            to_send.remove(x)
        reg_max_size = max([x['regular_size'] for x in to_send])
        diff_max_size = max([x['diff_size'] for x in to_send])
        for x in to_send:
            x['regular_size'] = self._max_wordcloud_size * x['regular_size'] / reg_max_size
            x['diff_size'] = self._max_wordcloud_size * x['diff_size'] / diff_max_size

        return(to_send)

    def _get_doc_top_words(self, docs):
        """
        Set the new field to be some words describing it.
        """
        for doc in docs:
            theta = np.array([doc['doc_topics']['Topic %s'%i] for i in range(self.K)])
            how_many_words = 4
            some_words = self._lda.get_top_doc_words(theta, how_many_words, self._vocab)
            doc['display_title'] = ', '.join(some_words)

    def forward(self, data):
        if DOCUMENTS in data:
            self._update_documents(data[DOCUMENTS])
        else:
            # Set the documents to our last copy to continue the forward model
            #return
            if len(self._docs) > 0:
                print("self._docs is greater than 0 in len")
                data[DOCUMENTS] = [{DOC_ID: x[DOC_ID], DOC_ATTRIBUTES : x[DOC_ATTRIBUTES]} for x in self._docs]
            else: 
                return
        
        docs = self._docs
        num_docs = len(docs)

        
        # If we don't have any documents or we don't need to update, just return
        if num_docs == 0 or (not self._new_docs and not self._new_weights) and DOC_TOPICS in list(data.keys()):
            return
        
        # We are updating now so make sure we only update again if we need to
        self._new_docs = self._new_weights = False

        #Let's make a tf matrix, then push it through LDA
        try:
            old_vocab = self._vocab
        except Exception:
            old_vocab = None
        tf = self._vectorize(docs)

        #Partof a bandaid solution
        #TODO: remove any hint that this block existed.
        #if old_vocab is not None and self._word_weights is not None:
        #    print 'Were filling in empty weights:'
        #    self._word_weights = np.array([self._word_weights[old_vocab.index(i)] if i in old_vocab else 0.05 for i in self._vocab])

        topic_mixtures = self._reduce(tf, topics=self.topics)

        # Set the medium dimensional position of each document
        for i, top in zip(range(len(data[DOCUMENTS])), topic_mixtures):
            doc = data[DOCUMENTS][i].copy()
            doc[DOC_TOPICS] = (top).tolist()
            
            # Remember the high dimensional position of the point for inverse
            if DOC_TOPICS in doc:
                self._high_d[doc[DOC_ID]] = doc[DOC_TOPICS]

            #Changed DOC_TOPICS from an unnamed list to a dict as the next module expects
            doc[DOC_TOPICS] = dict(list(zip(['Topic %s'%j for j in range(self.topics)], (top).tolist())))
            doc['color'] =  self._colors[np.argmax(top)]

            data[DOCUMENTS][i] = doc

        #Get the top word for the wordcloud
        data['cloud'] = self.get_top_topic_words(self._num_topic_words)
        self._get_doc_top_words(data['documents'])

        
    def inverse(self, data):
        """
        Do inverse LDA by getting induced weights through propogation of iMDS topic weights onto the words.
        """
        interaction = data[INTERACTION]

        if TOPIC_WEIGHTS in list(data.keys()):
            topic_weights = data[TOPIC_WEIGHTS]
            self._word_weights = self._get_induced_weights(topic_weights)
            self._new_weights = True
            print("Ok we've got the inverse LDA now")
         
    def reset(self):
        self._word_weights = np.array([])
        self._docs = []
        self._high_d = {}
        self._lda = None
        self._vocab = []
        self._last_BETA = None