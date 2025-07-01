package dev.ai.mock.controller;

import dev.ai.mock.entities.ResumeJsonEntity;
import dev.ai.mock.entities.UserEntity;
import dev.ai.mock.records.ResumeContent;
import dev.ai.mock.repository.ResumeJsonRepository;
import dev.ai.mock.repository.UserRepository;
import dev.ai.mock.service.ResumeFormatService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/interview")
@CrossOrigin(origins = "http://localhost:3000")
public class InterviewController {
    private final UserRepository userRepository;

    public record Question(String question) {}

    private final ChatClient chatClient;
    private final ResumeFormatService resumeFormatService;
    private final ResumeJsonRepository resumeJsonRepository;
    public InterviewController(ChatClient.Builder builder, ChatMemory chatMemory, ResumeFormatService resumeFormatService, ResumeJsonRepository resumeJsonRepository, UserRepository userRepository) {
        this.resumeJsonRepository = resumeJsonRepository;
        this.chatClient = builder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
        this.resumeFormatService = resumeFormatService;
        this.userRepository = userRepository;
    }

    @PostMapping("/respond")
    public Question respond(@RequestBody String answer) {

        return chatClient.prompt()
                .user(answer)
                .call()
                .entity(Question.class);
    }

    @GetMapping("/start/{id}")
    public String start(@PathVariable(name = "id") Long id,
                        @RequestParam(name = "jobRole") String jobRole,
                        @RequestParam(name = "company") String company) {

        Optional<UserEntity> optionalUser = userRepository.findById(id);
        if (optionalUser.isEmpty()) {
            throw new RuntimeException("User not found");
        }
        UserEntity user = optionalUser.get();

        if(!user.isPro()) {
            if (user.getTrials() <= 0) {
                throw new RuntimeException("No remaining trials for mock interview.");
            }
            user.setTrials(user.getTrials() - 1);
            userRepository.save(user);
        }

        Optional<ResumeJsonEntity> optionalResumeJsonEntity = resumeJsonRepository.findByUserId(id);
        if(optionalResumeJsonEntity.isEmpty()) {
            throw new RuntimeException("Resume Have not Uploaded Yet");
        }

        ResumeContent resume = resumeFormatService.getResume(optionalResumeJsonEntity.get().getId());

        var systemInstruction = """
            You are a professional technical interviewer. Your job is to ask clear, focused, and relevant interview questions one at a time.
            
            Your behavior should simulate a real-world technical interview:
            - Ask concise, realistic questions — no more than 2-3 sentences.
            - Base your questions on the candidate's resume and the job Role.
            - Adjust your questions based on the candidate’s previous answers.
            - Focus on skills, tools, and experiences mentioned in the resume that align with the job.
            - Prioritize technical, behavioral, and situational questions relevant to the role.
            - Ask only one question at a time. Wait for an answer before continuing.
            
            Stay professional and to the point. Do not explain or justify your questions. Just ask like a real interviewer.
            """;

        var userMessage = """
                Hi, I’m ready for my interview. Please begin by asking questions based on my resume and the job description.
                
                Resume:
                {resume}
                
                company:
                {company}
                
                Job Role:
                {jobRole}
                """;


        return chatClient.prompt()
                .system(systemInstruction)
                .user( u -> {
                    u.text(userMessage);
                    u.param("resume", resume);
                    u.param("jobRole", jobRole);
                    u.param("company", company);
                })
                .call()
                .content();

    }
}
