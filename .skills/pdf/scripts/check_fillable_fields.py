#!/usr/bin/env python3
"""Check if a PDF has fillable form fields."""

import sys
from pypdf import PdfReader


def main():
    if len(sys.argv) != 2:
        print("Usage: check_fillable_fields.py <input.pdf>")
        sys.exit(1)

    reader = PdfReader(sys.argv[1])

    if reader.get_fields():
        print("This PDF has fillable form fields")
        fields = reader.get_fields()
        for key, field in fields.items():
            print(f"  - {key}: {field.get('/FT', 'unknown type')}")
    else:
        print("This PDF does not have fillable form fields; you will need to visually determine where to enter data")


if __name__ == "__main__":
    main()
