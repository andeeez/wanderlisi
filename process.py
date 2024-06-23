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

tracksDir = sys.argv[1]+"/tracks"
dropbox = sys.argv[2]

while True:
    for filepath in glob.iglob(tracksDir + '/*.gpx'):
        doc = parse(filepath)
        name = doc.getElementsByTagName("name")[0].firstChild.nodeValue
        stripped = name.replace('\u2013', '-')
        trackName = "".join( x for x in stripped if (x.isalnum() or x in ",_-() "))
        new = False
        try:
            os.mkdir(tracksDir+"/"+trackName)
            new = True
        except Exception as e:
            sys.stderr.write("Warning: "+str(e)+"\n")
        try:
            shutil.copyfile(filepath, tracksDir+"/"+trackName+"/"+trackName+".gpx")
            os.remove(filepath)
            if new:
                shutil.copyfile(tracksDir+"/index.php", tracksDir+"/"+trackName+"/index.php")
                shutil.copyfile(tracksDir+"/notes.md", tracksDir+"/"+trackName+"/notes.md")
        except Exception as e:
            sys.stderr.write(str(e)+"\n")

        metadata = {
            'folder' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(tracksDir+"/"+trackName)+'"').read(),
            'notes' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(tracksDir+"/"+trackName+'/notes.md"')).read()
        }

        with open(tracksDir+"/"+trackName+'/metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)

    time.sleep(10)
