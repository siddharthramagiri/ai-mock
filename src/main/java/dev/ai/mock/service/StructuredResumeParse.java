package dev.ai.mock.service;

import dev.ai.mock.records.ResumeContent;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

@Service
public class StructuredResumeParse {

    private final ChatClient chatClient;
    private final ResumeFormatService resumeFormatService;
    public StructuredResumeParse(ChatClient.Builder builder, ResumeFormatService resumeFormatService) {
        this.chatClient = builder.build();
        this.resumeFormatService = resumeFormatService;
    }

    public ResumeContent structuredResume(String rawText, Long userId) {
        var systemInstruction = """
                You are an intelligent AI Resume Parsing Agent designed to extract structured and relevant information from raw text resumes.
                Your task is to analyze and extract all meaningful career-related entities from unstructured text parsed from a PDF resume.
                Focus on accuracy, ignore any irrelevant text like headers, page numbers, or formatting artifacts.
                Return the results in a structured JSON format under clearly labeled fields.
                """;

        var userPrompt = """
                Below is the rawText extracted from a user's resume PDF:
                
                {rawText}
                """;

        ResumeContent resumeContent = chatClient.prompt()
                .system(systemInstruction)
                .user(u -> {
                    u.text(userPrompt);
                    u.param("rawText", rawText);
                })
                .call()
                .entity(ResumeContent.class);

        resumeFormatService.saveResume(resumeContent, userId);
        return resumeContent;
    }

}
