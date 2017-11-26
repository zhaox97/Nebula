#!/usr/bin/env python
# -*- coding: utf-8 -*-
#  mto.py Author "Nathan Wycoff <nathanbrwycoff@gmail.com>" Date 11.23.2017

"""
User-specified model for which hyperparamters shall be optimized, with 
concomitant data.
"""

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import KFold
from scipy import stats

class HyperParameter(object):
    """
    Represents one hyperparameter, stores just a name for now.

    Could also store restrictions on its value as well as a description.
    """
    def __init__(self, name, restrict = None, descript = None):
        self.name = name

class VizData(object):
    """
    Class that represents data which will be used to train as well as evaluate
    the model interactively using the Andromeda visualization tool.

    Major components are 'X' and 'y' data, that is, the potentially high
    dimensional factors/features/independent variables, and the unidimensional
    response/dependent variable. 

    At present, the response must be binary.
    """
    def __init__(self, X, y):
        self.X = X
        self.y = y
        self.n = len(y)
        if self.n != X.shape[0]:
            print 'WARN: y and X not like shapes'

class ModelToOptimize(object):
    """
    This class represents, as the name gently hints at, a model which we wish 
    to optimize by varying its hyperparameters. It should interface with data,
    but does not to expose them, as well as the models and hyperparams, which
    do need to be exposed.

    data: a VizData object
    hyperparams: a list of HyperParameter objects
    """
    def __init__(self, data, hyperparams, folds = 10):
        self.data = data
        self.hyperparams = hyperparams
        self.folds = folds#Folds to use for evaluation.

    def train_predict(self, h_vals):
        """
        Train the model with the given hyperparam settings, and then evaluate
        it using folds-fold cross validation.

        Returns a single double in [0,1], the prediction accuracy.

        h_vals: the value of each hyperparams (a list of numbers)
        folds: number of folds to use for CV (an integer)
        """

        #Convert the real valued stuff into something more appropriate.
        h_vals[0] = np.exp(h_vals[0])#These guys should be positive
        h_vals[1] = np.exp(h_vals[1])
        h_vals[2] = stats.norm.cdf(h_vals[2])#The mixture weight needs to 
        #... be in [0,1]

        #Split the data randomly
        kf = KFold(n_splits = self.folds, shuffle = True)

        oos_preds = []
        for train_inds, test_inds in kf.split(self.data.X):
            X_train = self.data.X[train_inds,:]
            X_test = self.data.X[test_inds,:]
            y_train = self.data.y[train_inds]
            y_test = self.data.y[test_inds]

            #Init the models with the correct hyperparams
            l2_logistic = LogisticRegression('l2', C = 1.0/h_vals[0])
            l1_logistic = LogisticRegression('l1', C = 1.0/h_vals[1])
            self.mixture = h_vals[2]

            #Train these models on our data
            l2_logistic.fit(X_train, y_train)
            l1_logistic.fit(X_train, y_train)

            #Get predictions from each. 
            pred_l2 = l2_logistic.predict_proba(X_test)
            pred_l1 = l1_logistic.predict_proba(X_test)

            #Combine and store preds
            preds = h_vals[2] * pred_l2 + (1-h_vals[2]) * pred_l1
            oos_preds.extend([x[1] for x in preds])
            self.swag = oos_preds

        #Now evaluate
        acc = [(oos_preds[i] > 0.5) == (self.data.y[i] > 0.5) for i in 
                range(self.data.n)]

        return np.mean(acc)

#For now, create some simulated data from a standard probit model
np.random.seed(123)
n = 1000
p = 2#Does not include intercept
X = np.random.normal(size=[n,p])
beta = np.random.normal(scale=10, size=p+1)
mu = np.dot(X, beta[1:]) + beta[0]
y = np.random.binomial(1, stats.norm.cdf(mu))

#Create the data
data = VizData(X, y)

#Create our hyperparameters
hyperparams = []
hyperparams.append(HyperParameter('l2_penalty'))
hyperparams.append(HyperParameter('l1_penalty'))
hyperparams.append(HyperParameter('mixture_odds'))
target = ModelToOptimize(data, hyperparams)
