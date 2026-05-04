#!/bin/bash

# Ensure the output directory exists
mkdir -p recovered_records/new

# Check if a specific file was provided as an argument
if [ -z "$1" ]; then
    echo "No specific file provided. Converting all PDFs in recovered_records/..."
    
    # Check if there are any PDFs in the folder
    shopt -s nullglob
    pdfs=(recovered_records/*.pdf)
    
    if [ ${#pdfs[@]} -eq 0 ]; then
        echo "No PDF files found in recovered_records/"
        exit 0
    fi

    for pdf in "${pdfs[@]}"; do
        # Extract filename without path and extension
        filename=$(basename -- "$pdf")
        filename_no_ext="${filename%.*}"
        
        echo "Processing $filename..."
        # Convert PDF to PNGs in the 'recovered_records/new' folder with 300 DPI resolution
        pdftoppm -png -r 300 "$pdf" "recovered_records/new/${filename_no_ext}"
    done
else
    # Process the specific file provided
    pdf="$1"
    
    if [ ! -f "$pdf" ]; then
        echo "Error: File $pdf does not exist."
        exit 1
    fi

    filename=$(basename -- "$pdf")
    filename_no_ext="${filename%.*}"
    
    echo "Processing $filename..."
    # Convert PDF to PNGs in the 'recovered_records/new' folder with 300 DPI resolution
    pdftoppm -png -r 300 "$pdf" "recovered_records/new/${filename_no_ext}"
fi

echo "Conversion complete! Check the 'recovered_records/new' folder for your images."
