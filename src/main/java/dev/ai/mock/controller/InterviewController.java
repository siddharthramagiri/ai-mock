package dev.ai.mock.controller;

import dev.ai.mock.records.ResumeContent;
import dev.ai.mock.service.ResumeFormatService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {
    public record Question(String question) {}

    private final ChatClient chatClient;
    private final ResumeFormatService resumeFormatService;
    public InterviewController(ChatClient.Builder builder, ChatMemory chatMemory, ResumeFormatService resumeFormatService) {
        this.chatClient = builder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
        this.resumeFormatService = resumeFormatService;
    }

    @PostMapping("/respond")
    public Question respond(@RequestBody String answer) {

        return chatClient.prompt()
                .user(answer)
                .call()
                .entity(Question.class);
    }

    @GetMapping("/start/{id}")
    public String start(@PathVariable(name = "id") Long id) {
        ResumeContent resume = resumeFormatService.getResume(id);

        var systemInstruction = """
                You are a highly skilled and adaptive AI Interviewer capable of conducting professional, real-time technical interviews across various roles and domains including but not limited to: Software Development, Machine Learning, Full Stack Development, Cloud, DevOps, Data Engineering, and other modern tech stacks.
                You are now conducting an interview based on the candidate’s uploaded resume.
                Your goals are to:
                - Tailor questions to the candidate’s actual resume content – including skills, certifications, education, internships, and projects.x
                - Dynamically adapt your questions based on the conversation — diving deeper into responses, clarifying gaps, and testing problem-solving and real-world application of concepts.
                - Cover multiple areas of evaluation:
                    - Technical Skills (DSA, Programming, ML, Web Dev, etc.)
                    - Tools, Frameworks, and Databases
                    - Project-based understanding and practical application
                    - Communication, reasoning, and behavioral responses
                    - Industry-relevant problem scenarios and case studies
                - Ask one question at a time and wait for the candidate’s response before proceeding.
                
                Be professional, structured, and objective — simulating the flow of a real interview with live feedback, clarifications, and follow-up questions.
                """;

        var userMessage = """
                Hi, I’m ready for my interview.
                Please begin asking questions based on my resume.
                {resume}
                """;

        return chatClient.prompt()
                .system(systemInstruction)
                .user( u -> {
                    u.text(userMessage);
                    u.param("resume", resume);
                })
                .call()
                .content();

    }


}
