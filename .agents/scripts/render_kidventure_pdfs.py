from pathlib import Path

import fitz


INPUTS = [
    Path("attached_assets/one_pager_1789491212489.pdf"),
    Path("attached_assets/KidVenture_Build_Manual_1789491316037.pdf"),
]
OUTPUT_DIR = Path(".agents/outputs/kidventure-pdf-pages")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

for input_path in INPUTS:
    document = fitz.open(input_path)
    safe_name = input_path.stem
    print(f"{input_path}: {document.page_count} pages")
    for page_number, page in enumerate(document, start=1):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
        output_path = OUTPUT_DIR / f"{safe_name}-page-{page_number}.png"
        pixmap.save(output_path)
        print(output_path)