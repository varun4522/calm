import re
import os

# Folder containing SVGs
svg_folder = "original/svgs"

# Number of mandalas (1–6)
num_mandalas = 6

# Default fill color
default_fill = "#eee"

for n in range(1, num_mandalas + 1):
    svg_path = os.path.join(svg_folder, f"mandala_{n}_500.svg")
    output_path = os.path.join(svg_folder, f"mandala_{n}_paths.txt")

    with open(svg_path, "r", encoding="utf-8") as f:
        svg_content = f.read()

    # Extract all path d="..."
    paths = re.findall(r'd="([^"]+)"', svg_content, re.DOTALL)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"const mandala_{n}_paths = [\n")
        for i, p in enumerate(paths, start=1):
            clean_p = p.replace("\n", " ").replace("\r", " ").strip()
            f.write(f"  {{ id: {i}, d: `{clean_p}`, defaultFill: \"{default_fill}\" }},\n")
        f.write("];\n")

    print(f"Extracted {len(paths)} paths → {output_path}")
