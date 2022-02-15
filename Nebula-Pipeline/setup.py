from setuptools import setup
import pip

setup(
      name="nebula",
      version="1.0",
      package_data={"nebula": ["*.txt", "java/*.jar"]},
      install_requires=[
                        "pyzmq",
                        "numpy",
                        "scipy",
                        "sklearn",
                        "tweepy",
                        "nltk",
                        "zerorpc",
                        "elasticsearch"
                        ],
      packages=['nebula'])
