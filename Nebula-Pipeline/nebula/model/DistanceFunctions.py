import numpy as np

def euclidean(u, v, w):
    u = np.array(u)
    v = np.array(v)
    w = np.array(w)
    dist = np.sqrt((((u - v) ** 2) * w).sum())
    return dist


def cosine(u, v, w):
    u = np.array(u)
    v = np.array(v)
    w = np.array(w)

    num = u.dot(v * w)
    denom = np.sqrt(u.dot(u * w)) * np.sqrt(v.dot(v * w))
    
    if denom > 0:
        return 1 - num / denom
    else:
        return 1