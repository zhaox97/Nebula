#By Theo Long
#This is a code specifically for readin file from cresent into es
#date: 7/13/2016
import operator
import os
import glob
import sys
import re
from datetime import datetime
from elasticsearch import Elasticsearch
import json
import pprint
import time

if __name__ == "__main__":

	infile=raw_input("json file name: ")
	host = raw_input('host: ')
	port = raw_input('port: ')
	target_index= raw_input('target_index: ')
	document_type= raw_input('document types: ')

	#default localhost 9200
	#es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
	es = Elasticsearch([{'host': host, 'port': port}])
	startTime = time.time()	
	count = 0
	print "==============================		started			=============================="
	with open(infile) as data:
		for line in data:
			d = json.loads(line)
			doc_id= d[u'story'][u'id']
			print doc_id
			es.index(index=target_index, doc_type=document_type, id=doc_id, body=d)
			count = count+1



	elapsedTime = time.time() - startTime
	m, s = divmod(elapsedTime, 60)
	h, m = divmod(m, 60)
	time=  "%d:%02d:%02d" % (h, m, s)
	print "==============================		Done			=============================="
	print "time used: ", time
	print "objects upload: ", count
		
    
    