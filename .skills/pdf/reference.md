# PDF Processing Reference

This document covers advanced PDF operations across multiple platforms.

## Python Libraries

### pypdfium2
Renders PDFs to images using PDFium (the library behind Chrome's PDF viewer).

```python
import pypdfium2 as pdfium

pdf = pdfium.PdfDocument("document.pdf")
renderer = pdf.render(
    scale=2.0,
    page_index_list=[0, 1, 2],
)
for i, page_image in enumerate(renderer):
    page_image.save(f"page_{i+1}.png")
```

### pdfplumber
Extracts structured text and tables with coordinate data.

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        # Extract text with position
        chars = page.chars
        # Extract tables
        tables = page.extract_tables()
```

### reportlab
Creates professional PDFs with styled tables.

```python
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib import colors

doc = SimpleDocTemplate("report.pdf")
table_data = [["Header", "Data"], ["Value", 123]]
table = Table(table_data)
table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
]))
doc.build([table])
```

## JavaScript Solutions

### pdf-lib (MIT)
Creates and modifies PDFs in any JS environment.

```javascript
import { PDFDocument } from 'pdf-lib';

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([550, 400]);
page.drawText('Hello World!', { x: 50, y: 350 });
const pdfBytes = await pdfDoc.save();
```

### pdfjs-dist (Apache)
Renders PDFs in browsers and extracts text with positioning.

```javascript
import * as pdfjs from 'pdfjs-dist';

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = '...';

// Load PDF
const loadingTask = pdfjs.getDocument('document.pdf');
const pdf = await loadingTask.promise;
const page = await pdf.getPage(1);
const content = await page.getTextContent();
```

## Command-Line Tools

### poppler-utils
- `pdftotext` - Extract text
- `pdftoppm` - Convert to images
- `pdfimages` - Extract embedded images

```bash
# Extract text preserving layout
pdftotext -layout input.pdf output.txt

# Convert to PNG images
pdftoppm -png input.pdf output_prefix

# Extract images
pdfimages -j input.pdf output_prefix
```

### qpdf
Handles splitting, merging, optimization, and encryption.

```bash
# Merge PDFs
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf

# Split pages
qpdf input.pdf --pages . 1-5 -- pages1-5.pdf

# Rotate pages
qpdf input.pdf output.pdf --rotate=+90:1
```

## Key Workflows

### Batch Processing with Error Handling

```python
import os
from pypdf import PdfReader, PdfWriter

def process_pdf(input_path, output_dir):
    try:
        reader = PdfReader(input_path)
        writer = PdfWriter()

        for i, page in enumerate(reader.pages):
            writer.add_page(page)

        output_path = os.path.join(output_dir, os.path.basename(input_path))
        with open(output_path, "wb") as f:
            writer.write(f)

        return True, output_path
    except Exception as e:
        return False, str(e)

# Process all PDFs in directory
for filename in os.listdir("input_dir"):
    if filename.endswith(".pdf"):
        success, result = process_pdf(f"input_dir/{filename}", "output_dir")
        print(f"{filename}: {'OK' if success else result}")
```

### OCR for Scanned Documents

```python
import pytesseract
from pdf2image import convert_from_path

def ocr_pdf(pdf_path):
    images = convert_from_path(pdf_path)
    text = ""

    for i, image in enumerate(images):
        text += f"--- Page {i+1} ---\n"
        text += pytesseract.image_to_string(image)
        text += "\n\n"

    return text
```

### Figure Extraction

```python
import pdfplumber

def extract_figures(pdf_path, output_dir):
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages):
            images = page.images
            for img_idx, img in enumerate(images):
                # img contains bbox coordinates and image data
                x0, y0, x1, y1 = img["bbox"]
                # Crop and save image
                cropped = page.crop((x0, y0, x1, y1))
                cropped.to_image().save(
                    f"{output_dir}/page{page_num+1}_img{img_idx}.png"
                )
```

## Performance Considerations

| Operation | Recommendation |
|-----------|----------------|
| Large PDFs | Process pages in chunks |
| Many images | Use `pdfimages` over rendering |
| Memory issues | Use streaming where possible |
| Speed | Set DPI appropriately (150-300 for OCR, 72-150 for preview) |

## Troubleshooting

### Encrypted PDFs
```python
from pypdf import PdfReader

reader = PdfReader("encrypted.pdf")
if reader.is_encrypted:
    reader.decrypt("password")
```

### Corrupted PDFs
Try repairing with qpdf:
```bash
qpdf --linearize input.pdf output.pdf
```

### Missing Fonts
When creating PDFs, embed fonts:
```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

pdfmetrics.registerFont(TTFont('CustomFont', 'path/to/font.ttf'))
```
