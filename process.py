#!/usr/bin/python3
import glob, os, sys, shutil, time
from xml.dom.minidom import parse
import unicodedata

def strip_accents(s):
   return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')

if len(sys.argv) <= 1:
    sys.stderr.write("Usage: process.py <basedir>\n")
    sys.exit(1)

basedir = sys.argv[1]

while True:
    for filepath in glob.iglob(basedir + '/*.gpx'):
        doc = parse(filepath)
        name = doc.getElementsByTagName("name")[0].firstChild.nodeValue
        stripped = name.replace('\u2013', '-')
        trackName = "".join( x for x in stripped if (x.isalnum() or x in ",_-() "))
        try:
            os.mkdir(basedir+"/"+trackName)
        except Exception as e:
            sys.stderr.write("Warning: "+str(e)+"\n")
        try:
            shutil.copyfile(filepath, basedir+"/"+trackName+"/"+trackName+".gpx")
            shutil.copyfile(basedir+"/index.php", basedir+"/"+trackName+"/index.php")
            os.remove(filepath)
        except Exception as e:
            sys.stderr.write(str(e)+"\n")
    time.sleep(10)