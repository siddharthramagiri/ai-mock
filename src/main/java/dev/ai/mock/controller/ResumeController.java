package dev.ai.mock.controller;

import dev.ai.mock.entities.ResumeJsonEntity;
import dev.ai.mock.records.ResumeContent;
import dev.ai.mock.service.PdfParserService;
import dev.ai.mock.service.ResumeFormatService;
import dev.ai.mock.service.StructuredResumeParse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequestMapping("/api/resume")
@CrossOrigin(origins = "${frontend.url}")
public class ResumeController {

    private final PdfParserService pdfParserService;
    private final StructuredResumeParse structuredResumeParse;
    private final ResumeFormatService resumeFormatService;

    public ResumeController(PdfParserService pdfParserService, StructuredResumeParse structuredResumeParse, ResumeFormatService resumeFormatService) {
        this.pdfParserService = pdfParserService;
        this.structuredResumeParse = structuredResumeParse;
        this.resumeFormatService = resumeFormatService;
    }

    /**
     * Upload and parse PDF resume to extract words
     *
     * @param file The PDF file to upload and parse
     * @return Response containing parsed words and metadata
     */
    @PostMapping("/upload/{id}")
    public ResponseEntity<ResumeContent> uploadAndParseResume(
            @PathVariable(name = "id") Long userId,
            @RequestParam("file") MultipartFile file) {
        try {
            // Validate file
            if (!pdfParserService.isValidPdfFile(file)) {
                return ResponseEntity.badRequest()
                        .body(null);
            }
            String rawText = pdfParserService.parsePdfToText(file);

            return ResponseEntity.ok(structuredResumeParse.structuredResume(rawText, userId));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(null);
        }
    }

    @PostMapping("/save/{id}")
    public ResponseEntity<ResumeJsonEntity> saveResume(
            @RequestBody ResumeContent resumeContent,
            @PathVariable(name = "id") Long id
    ) {
        return resumeFormatService.saveResume(resumeContent, id);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ResumeContent> getResume(@PathVariable(name = "id") Long id) {
        try {
            return ResponseEntity.ok(resumeFormatService.getResume(id));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Health check endpoint
     *
     * @return Simple health status
     */
    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("Resume Parser API is running!");
    }

    /**
     * Get API information
     *
     * @return API information
     */
    @GetMapping("/info")
    public ResponseEntity<String> getInfo() {
        return ResponseEntity.ok("Resume Parser API - Upload PDF files to extract text content");
    }
}