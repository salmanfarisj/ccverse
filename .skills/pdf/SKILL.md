# PDF Skill

This skill provides PDF processing capabilities using Python libraries and command-line tools.

## Overview

The PDF skill enables:
- PDF parsing and text extraction
- Form handling and filling
- PDF manipulation (merge, split, rotate)
- Image conversion from PDFs
- Table extraction
- OCR for scanned documents

## Setup

Dependencies are installed automatically when the skill is first used. Alternatively, install manually:

```bash
pip install pypdf pdfplumber pdf2image reportlab pytesseract
```

For OCR functionality, you'll also need Tesseract OCR installed on your system:
- macOS: `brew install tesseract`
- Ubuntu/Debian: `sudo apt install tesseract-ocr`
- Windows: Download installer from GitHub

## Usage

### Extract Text from PDF

```python
from pypdf import PdfReader

reader = PdfReader("document.pdf")
text = ""
for page in reader.pages:
    text += page.extract_text()
```

### Convert PDF to Images

```bash
python .skills/pdf/scripts/convert_pdf_to_images.py input.pdf output_dir/
```

### Check Fillable Fields

```bash
python .skills/pdf/scripts/check_fillable_fields.py input.pdf
```

### Fill PDF Forms

1. Check for fillable fields:
```bash
python .skills/pdf/scripts/check_fillable_fields.py form.pdf
```

2. Extract field info:
```bash
python .skills/pdf/scripts/extract_form_field_info.py form.pdf
```

3. Create `field_values.json` with field values

4. Fill the form:
```bash
python .skills/pdf/scripts/fill_fillable_fields.py form.pdf field_values.json output.pdf
```

### Extract Tables

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            print(table)
```

## Command-Line Tools

- `pdftotext` - Extract text from PDF
- `pdfinfo` - Get PDF metadata
- `pdftoppm` - Convert PDF to images
- `pdfimages` - Extract images from PDF
- `qpdf` - PDF manipulation (merge, split, rotate)

## Quick Reference

| Task | Best Tool |
|------|-----------|
| Extract text | pypdf, pdfplumber |
| Extract tables | pdfplumber |
| Fill forms | pdf-lib (JS) or pypdf |
| Create PDFs | reportlab |
| OCR scanned PDFs | pytesseract + pdf2image |
| Merge/split | qpdf or pypdf |

## See Also

- [forms.md](forms.md) - Detailed form filling instructions
- [reference.md](reference.md) - Advanced reference documentation
