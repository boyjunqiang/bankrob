import os
from PIL import Image

assets_dir = os.path.join('public', 'assets')
images = ['bag_brown.png', 'bag_dark.png', 'bag_green.png', 'bag_gold.png', 'bag_yellow.png']

for img_name in images:
    path = os.path.join(assets_dir, img_name)
    if os.path.exists(path):
        img = Image.open(path)
        # Resize to 256x256 max while keeping aspect ratio
        img.thumbnail((256, 256), Image.Resampling.LANCZOS)
        # Save as PNG with optimization
        img.save(path, 'PNG', optimize=True, quality=75)
        print(f"Compressed {img_name}")
    else:
        print(f"Not found: {img_name}")

print("Compression complete!")
