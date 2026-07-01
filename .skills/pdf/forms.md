# PDF Form Filling Guide

This document outlines a workflow for filling PDF forms with two main paths.

## Path 1: Fillable PDFs

For PDFs with existing fillable form fields:

1. **Check for fillable fields**
   ```bash
   python .skills/pdf/scripts/check_fillable_fields.py input.pdf
   ```

2. **Extract field information**
   ```bash
   python .skills/pdf/scripts/extract_form_field_info.py input.pdf
   ```

3. **Convert PDF to images for visual analysis** (optional but recommended)
   ```bash
   python .skills/pdf/scripts/convert_pdf_to_images.py input.pdf output_dir/
   ```

4. **Create `field_values.json`**
   Create a JSON file with values for each field:
   ```json
   {
     "field_name_1": "value 1",
     "field_name_2": "value 2"
   }
   ```

5. **Fill the form**
   ```bash
   python .skills/pdf/scripts/fill_fillable_fields.py input.pdf field_values.json output.pdf
   ```

## Path 2: Non-Fillable PDFs

For scanned or image-based PDFs without fillable fields:

1. **Try structure extraction**
   ```bash
   python .skills/pdf/scripts/extract_form_structure.py input.pdf
   ```

2. **Choose your approach:**
   - **Approach A**: If structure extraction works, use exact coordinates
   - **Approach B**: Use visual estimation with zoom refinement
   - **Hybrid**: Combine both approaches as needed

3. **Validate bounding boxes before filling**
   ```bash
   python .skills/pdf/scripts/check_bounding_boxes.py input.pdf coordinates.json
   ```

4. **Convert output to images to verify text placement**

## Always

- Validate bounding boxes with `check_bounding_boxes.py` before filling
- Convert output to images to verify text placement
- Test on a single page before processing entire document

## Field Value JSON Format

```json
{
  "field_name": "value",
  "checkbox_field": true,
  "date_field": "2024-01-15"
}
```

## Important Notes

- Use the `convert_pdf_to_images.py` script to visually inspect the PDF before and after filling
- For fillable PDFs, always use the fillable field methods first
- For non-fillable PDFs, you may need to use annotation-based methods or OCR
- Validate your coordinates carefully - incorrect placement can make forms illegible
