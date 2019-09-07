# -*- coding: UTF-8 -*-

import sys
import os
import re

# Initialize the tf and df dictionaries
tf = {}
df = {}

def main():
    # First check to ensure that we have the proper number of parameters
    if len(sys.argv) < 3 or not (len(sys.argv) == 4 and sys.argv[1] == "--contains_url") or len(sys.argv) > 4:
        print "Error: Incorrect usage"
        print "Usage: 'python text_tfidf_calculator.py [--contains_url] ./directory/path csv_file_name.csv"
        sys.exit()
        
    # Determine whether a URL should be parsed from the first line of the files
    should_parse_url = False
    if len(sys.argv) == 4:
        should_parse_url = True
        
    
    # Parse the NLTK stopwords
    nltk_stopwords_location = "../../Nebula-Pipeline/nebula/data_controller/nltkStopwords.txt"
    nltk_stopwords = open(nltk_stopwords_location, "r").readlines()
    for i in range(0, len(nltk_stopwords)):
        nltk_stopwords[i] = nltk_stopwords[i][:-1]
    
    # Parse all the files in the specified directory
    directory = sys.argv[-2]
    for file_name in os.listdir(directory):
        
        # Get the file contents
        file_contents = open(directory + file_name, "r").readlines()
        
        # Remove the ".txt" from the file name
        file_name = file_name[:-len(".txt")]
        
        # Initialize the tf dict for this file
        tf[file_name] = {}
        for word in df:
            tf[file_name][word] = 0
        
        # Parse the website name and add the word to the tf and df dicts
        if should_parse_url:
            url = ""
            if "https" in file_contents[0]:
                url = file_contents[0][(len("https\://")-1):]
            else:
                url = file_contents[0][(len("http\://")-1):]
            website = url[:url.find("/")]
            add_word(file_name, website)
        
        # Parse the rest of the file line by line, tracking the words seen in
        # the file as we go so we know when to add it to the df dict
        for i in range(1, len(file_contents)):
            line = file_contents[i].decode("utf-8").strip()
            regex = re.compile('[^a-zA-Z0-9;:\-\.\\ ]')
            line = regex.sub('', line)
            if len(line) > 1:
                parsed_line = re.split(",|;|:| |-", line)
                for word in parsed_line:
                    word = word.lower().strip()
                    
                    # Remove any "." at the end of the word
                    if len(word) > 1:
                        if word[-1] == ".":
                            word = word[:-1]
                            
                    # Translate any periods (like in URLS) to ensure that the
                    # word can be properly processed
                    word = word.replace(".", " ")
                        
                    # Ensure that the word length is still > 1
                    if len(word) > 1:
                        if word.lower() not in nltk_stopwords:
                            add_word(file_name, word)
    
    # Calculate the TF-IDF values
    tfidf = {}
    for file in tf:
        tfidf[file] = {}
        for word in df:
            # Only process words where the df > 3 or df < (num_files - 3)
            if df[word] >= 3 and df[word] <= (len(tf) - 3):
                tfidf[file][word] = float(tf[file][word]) / df[word]
    
    # Create an empty CSV file
    csv_file = open(sys.argv[-1], "w")
    
    # Write the headers for the CSV file
    first_line = "file_name"
    for word in tfidf[tfidf.keys()[0]]:
        word = word.replace(" ", ".")
        first_line += "," + word
    csv_file.write(first_line + "\n")
    
    # Parse the TF-IDF values for each file and write them to the CSV file
    for file in tfidf:
        line = file
        for word in tfidf[file]:
            line += "," + str(tfidf[file][word])
            
        csv_file.write(line + "\n")
        
# Increment the count for the given word in the tf and df dictionaries
def add_word(file_name, word):
    
    # Determine whether we've already seen this word in the file
    word_seen_in_file = word in df and word in tf[file_name] and tf[file_name][word] > 0
    if not word_seen_in_file and word not in df:
        
        # Check to see if there is a similar word that has already been stored
        # Only keep the shorter word (e.g., "Europe" instead of "European")
        for stored_word in df:
            if check_word_contains(word, stored_word):
                word = stored_word
                word_seen_in_file = True
            elif check_word_contains(stored_word, word):
                word_seen_in_file = True
                df[word] = df[stored_word]
                del df[stored_word]
                for file in tf:
                    tf[file][word] = tf[file][stored_word]
                    del tf[file][stored_word]

            if word_seen_in_file:
                word_seen_in_file = tf[file_name][word] > 0
                break
                    
    # Add the word to the df dict if necessary
    if not word_seen_in_file:
        if word in df:
            df[word] += 1
        else:
            df[word] = 1
            
            # If we haven't seen this word before, then we should initialize all
            # documents' tfs for this word to 0
            for file in tf:
                tf[file][word] = 0
            
        
    # At this point, we are guaranteed to have at least initialized the tf to 0,
    # so we can just increment the count
    tf[file_name][word] += 1
    
# Helper function to determine if word1 is considered a valid subset of word2
# Examples: say vs says
def check_word_contains(word1, word2):
    valid_word_endings = ["ing", "ed", "d", "s", "er", "est"]
    if word1.startswith(word2):
        if len(word1) == len(word2):
            return True
        else:
            for word_ending in valid_word_endings:
                if word1.endswith(word_ending) and (len(word1)-len(word2)-len(word_ending)) < 2:
                    return True
            return False
    else:
        return False
        
        
        
if __name__ == "__main__":
    main()