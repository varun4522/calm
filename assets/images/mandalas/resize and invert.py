import os
from PIL import Image, ImageOps

# Base folder where your original images are stored
base_dir = "original"

# Output folders
resized_dir = os.path.join(base_dir, "resized")
inverted_dir = os.path.join(base_dir, "inverted")

# Create the output directories if they don't exist
os.makedirs(resized_dir, exist_ok=True)
os.makedirs(inverted_dir, exist_ok=True)

# Loop through all files in the folder
for filename in os.listdir(base_dir):
    # Skip folders
    if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
        continue

    filepath = os.path.join(base_dir, filename)

    try:
        # Open image
        img = Image.open(filepath).convert("RGB")

        # Resize to 500x500
        resized_img = img.resize((500, 500))
        resized_path = os.path.join(resized_dir, filename.replace(".", "_resized."))
        resized_img.save(resized_path)

        # Invert colors
        inverted_img = ImageOps.invert(resized_img)
        inverted_path = os.path.join(inverted_dir, filename.replace(".", "_inverted."))
        inverted_img.save(inverted_path)

        print(f"✅ Processed {filename}")

    except Exception as e:
        print(f"⚠️ Skipped {filename} due to error: {e}")
