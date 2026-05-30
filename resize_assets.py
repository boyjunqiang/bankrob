import os
from PIL import Image

assets_dir = os.path.join('public', 'assets')

def resize_image(filename, target_width=None, target_size=None):
    path = os.path.join(assets_dir, filename)
    if not os.path.exists(path):
        print(f"Not found: {filename}")
        return

    img = Image.open(path)
    if target_size:
        img.thumbnail(target_size, Image.Resampling.LANCZOS)
    elif target_width:
        wpercent = (target_width / float(img.size[0]))
        hsize = int((float(img.size[1]) * float(wpercent)))
        img = img.resize((target_width, hsize), Image.Resampling.LANCZOS)
        
    img.save(path, 'PNG' if path.endswith('.png') else 'JPEG', optimize=True)
    print(f"Resized {filename} to {img.size}")

# 1. Bags: we want them to be around 36x36 (small!)
for bag in ['bag_brown.png', 'bag_dark.png', 'bag_green.png', 'bag_gold.png', 'bag_yellow.png']:
    resize_image(bag, target_size=(36, 36))

# 2. Safes:
resize_image('safe.png', target_width=95)
for safe in ['5保险.png', '10保险.png', '15倍.png', '转式保险箱.png']:
    resize_image(safe, target_width=44)

# 3. Handle:
resize_image('把手.png', target_width=180)

print("All physical resizes complete!")
