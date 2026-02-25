import docx
import os

doc_path = r"excel_data\Hausanschluss_KI_Referenzhandbuch.docx"
output_path = "docx_content.txt"

if os.path.exists(doc_path):
    doc = docx.Document(doc_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    content = "\n".join(full_text)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Content saved to {output_path}")
else:
    print(f"File not found: {doc_path}")
