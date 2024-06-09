#!/usr/bin/python3
import glob, os, sys, shutil, time, json
from xml.dom.minidom import parse
import unicodedata

def strip_accents(s):
   return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')

if len(sys.argv) <= 1:
    sys.stderr.write("Usage: process.py <basedir>\n")
    sys.exit(1)

basedir = sys.argv[1]
dropbox = sys.argv[2]

while True:
    for filepath in glob.iglob(basedir + '/*.gpx'):
        doc = parse(filepath)
        name = doc.getElementsByTagName("name")[0].firstChild.nodeValue
        stripped = name.replace('\u2013', '-')
        trackName = "".join( x for x in stripped if (x.isalnum() or x in ",_-() "))
        new = False
        try:
            os.mkdir(basedir+"/"+trackName)
            new = True
        except Exception as e:
            sys.stderr.write("Warning: "+str(e)+"\n")
        try:
            shutil.copyfile(filepath, basedir+"/"+trackName+"/"+trackName+".gpx")
            os.remove(filepath)
            if new:
                shutil.copyfile(basedir+"/index.php", basedir+"/"+trackName+"/index.php")
                shutil.copyfile(basedir+"/notes.md", basedir+"/"+trackName+"/notes.md")
        except Exception as e:
            sys.stderr.write(str(e)+"\n")

        metadata = { 
            'folder' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(basedir+"/"+trackName)+'"').read(),
            'notes' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(basedir+"/"+trackName+'/notes.md"')).read()
        }

        with open(basedir+"/"+trackName+'/metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)

    time.sleep(10)
