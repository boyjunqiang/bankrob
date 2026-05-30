import requests
import os

def remove_bg(filename, out_filename):
    url = "http://k165.com:9800/api/proxy/background-removal/api/remove-background-single"
    path = os.path.join("public", "assets", filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return

    with open(path, 'rb') as f:
        files = {'file': (filename, f, 'image/jpeg')}
        response = requests.post(url, files=files)
    
    if response.status_code == 200:
        out_path = os.path.join("public", "assets", out_filename)
        with open(out_path, 'wb') as f:
            f.write(response.content)
        print(f"Saved {out_filename}")
    else:
        print(f"Failed {filename}: {response.status_code} {response.text}")

remove_bg("btn_normal.jpg", "btn_normal.png")
remove_bg("btn_pressed.jpg", "btn_pressed.png")
