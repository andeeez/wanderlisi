#!/usr/bin/python3
import glob, os, sys, shutil, time, json, subprocess
from xml.dom.minidom import parse
import unicodedata

def strip_accents(s):
   return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')

if len(sys.argv) <= 1:
    sys.stderr.write("Usage: process.py <basedir>\n")
    sys.exit(1)

basedir = sys.argv[1]
tracksDir = basedir + "/tracks"
dropbox = sys.argv[2]

# Define the maximum width or height
max_dimension = 1000

def resize_image(image_path):
    subprocess.run([
        "convert", image_path, "-resize", f"{max_dimension}x{max_dimension}>", image_path
    ])

def process_images_in_folder(folder_path):
    for root, _, files in os.walk(folder_path):
        for file in files:
            if file.lower().endswith(".jpg") or file.lower().endswith(".jpeg"):
                image_path = os.path.join(root, file)

                try:
                    dimensions = subprocess.check_output([
                        "identify", "-format", "%wx%h", image_path
                    ])
                    width, height = map(int, dimensions.split(b'x'))

                    if width > max_dimension or height > max_dimension:
                        resize_image(image_path)
                except subprocess.CalledProcessError as e:
                    sys.stderr.write(f"Error processing {image_path}: {e}")

while True:
    for filepath in glob.iglob(basedir + '/*.gpx'):
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

        time.sleep(3)

        metadata = {
            'folder' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(tracksDir+"/"+trackName)+'"').read(),
            'notes' : os.popen(dropbox+ ' sharelink "'+ os.path.abspath(tracksDir+"/"+trackName+'/notes.md"')).read()
        }

        with open(tracksDir+"/"+trackName+'/metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=4)

    process_images_in_folder(tracksDir)

    time.sleep(10)
