#By Theo Long
#This is a python script for uploading generic json file into elastic search
#date: 08/27/2016
import sys
import re
from datetime import datetime
from elasticsearch import Elasticsearch
import json
import pprint
import time

if __name__ == "__main__":

	#taking input arguments:
	infile=raw_input("json file name: ")
	host = raw_input('host: ')
	port = raw_input('port: ')
	target_index= raw_input('target_index: ')
	document_type= raw_input('document types: ')

	#default localhost 9200
	#es = Elasticsearch([{'host': 'localhost', 'port': 9200}])
	#connect to es server
	es = Elasticsearch([{'host': host, 'port': port}])
	startTime = time.time()	
	count = 0
	print "==============================		started			=============================="
	with open(infile) as data:
		for line in data:
			#json load can only decode json object one at a time. So the code has to loop through all the lines
			d = json.loads(line)
			# read in doc ID field to 
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
		
    
    