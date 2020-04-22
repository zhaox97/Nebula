FROM ubuntu:16.04

RUN mkdir /www
WORKDIR /www
RUN apt-get update

# Install node v8.16.2 and npm version 6.4.1
# This version is necessary for zmq
RUN apt-get install -y curl && \
        curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
        apt-get install -y nodejs

RUN apt-get install -y libzmq-dev python python-pip

# Fix certificate issues, found as of 
# https://bugs.launchpad.net/ubuntu/+source/ca-certificates-java/+bug/983302
RUN apt-get install -y openjdk-8-jdk && \
	apt-get install -y ant && \
	apt-get install ca-certificates-java && \
	apt-get clean && \
	update-ca-certificates -f;

# Setup JAVA_HOME, this is useful for docker commandline
ENV JAVA_HOME /usr/lib/jvm/java-8-openjdk-amd64/
RUN export JAVA_HOME

RUN pip install --upgrade pip
COPY . /www
RUN npm install

RUN pip install -e ./Nebula-Pipeline
#RUN pip install numpy scipy cython zerorpc tweepy nltk elasticsearch
#RUN python -m nltk.downloader stopwords

# Install Nathan Wycoff's version of sklearn
COPY ./lib/ /opt/lib
RUN pip install -U /opt/lib/scikit_learn-0.19.dev0-cp27-cp27mu-linux_x86_64.whl

# Install tmux
#RUN apt install -y tmux

# Install nodemon specifically here so that we can use the command below
RUN npm install -g nodemon

EXPOSE 8081

# Attempt to run npm withing a tmux sesssion
# Docker only seems to care about whatever command it's being launched with,
# meaning once the associated process ends, the Docker container stops running
# My hope was to make Docker "care" about a tmux session as opposed to npm,
# which would let you go in and restart npm as desired, but I couldn't quite
# get this working...
#CMD ["sh", "-c",  "tmux new-session -d -s nebula_session1 && tmux send-keys -t nebula_session1 'npm start' ENTER"]

CMD ["nodemon", "-L", "start"]
