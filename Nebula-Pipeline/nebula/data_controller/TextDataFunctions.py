import re
from nltk.corpus import stopwords
from nltk.tokenize import RegexpTokenizer

def preprocess(sentence, blacklist, remove_ints=False):
    """Changes a set of text into pure lowercase alphanumeric characters and 
    removes common stopwords and all words in the provided blacklist."""
    
    sentence = sentence.lower()
    sentence = re.sub(r'\w+:\/{2}[\d\w-]+(\.[\d\w-]+)*(?:(?:\/[^\s/]*))*', '', sentence)
    sentence = re.sub(r"#(\w+)", '', sentence)
    sentence = re.sub(r"@(\w+)", '', sentence)
    tokenizer = RegexpTokenizer(r'\w+')
    tokens = tokenizer.tokenize(sentence)
    allbadwords = stopwords.words('english') + blacklist
    filtered_words = [w for w in tokens if not w in allbadwords]
    if remove_ints:
	    filtered_words = [w for w in filtered_words if not w.isdigit()]
    return " ".join(filtered_words)