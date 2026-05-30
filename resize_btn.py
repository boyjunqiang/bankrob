import os
from PIL import Image

def resize_img(filename):
    path = os.path.join('public', 'assets', filename)
    if os.path.exists(path):
        img = Image.open(path)
        img.thumbnail((128, 128), Image.Resampling.LANCZOS)
        img.save(path, 'PNG', optimize=True)
        print(f"Resized {filename} to {img.size}")

resize_img('btn_normal.png')
resize_img('btn_pressed.png')
