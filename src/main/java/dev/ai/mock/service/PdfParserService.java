package dev.ai.mock.service;


import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PdfParserService {

    /**
     * Parse PDF file and extract text content
     * @param file The PDF file to parse
     * @return List of words extracted from the PDF
     * @throws IOException if there's an error reading the PDF
     */
    public List<String> parsePdfToWords(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            // Split text into words, remove empty strings and normalize
            return Arrays.stream(text.split("\\s+"))
                    .map(String::trim)
                    .filter(word -> !word.isEmpty())
                    .map(String::toLowerCase)
                    .collect(Collectors.toList());
        }
    }

    /**
     * Parse PDF file and return raw text content
     * @param file The PDF file to parse
     * @return Raw text content from the PDF
     * @throws IOException if there's an error reading the PDF
     */
    public String parsePdfToText(MultipartFile file) throws IOException {
        try (PDDocument document = PDDocument.load(file.getInputStream())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    /**
     * Validate if the uploaded file is a PDF
     * @param file The file to validate
     * @return true if the file is a valid PDF, false otherwise
     */
    public boolean isValidPdfFile(MultipartFile file) {
        return file != null &&
                !file.isEmpty() &&
                "application/pdf".equals(file.getContentType()) &&
                file.getOriginalFilename() != null &&
                file.getOriginalFilename().toLowerCase().endsWith(".pdf");
    }
}