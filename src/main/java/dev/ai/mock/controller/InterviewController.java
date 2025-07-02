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

//        return new Question("This is your next Question");
    }

    @GetMapping("/start/{id}")
    public String startInterview(@PathVariable("id") Long userId,
                                 @RequestParam("jobRole") String jobRole,
                                 @RequestParam("company") String company) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

//        return "Hello There Iam here to Interview you";

        if (!user.isPro()) {
            if (user.getTrials() <= 0) {
                throw new RuntimeException("No remaining trials for mock interview.");
            }
            user.setTrials(user.getTrials() - 1);
            userRepository.save(user);
        }

        ResumeJsonEntity resumeEntity = resumeJsonRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Resume has not been uploaded yet."));

        ResumeContent resumeContent = resumeFormatService.getResume(resumeEntity.getId());

        String systemPrompt = """
        You are a professional technical interviewer conducting a realistic mock interview for a job candidate.
        The candidate has applied for the role of %s at %s.

        Guidelines:
        - Ask one question at a time.
        - Focus on resume experiences, skills, and the job role.
        - Include technical, behavioral, and situational questions.
        - Adjust your questions based on previous answers.
        - Stay professional and to-the-point. Do not explain your questions.

        Begin the interview.
        """.formatted(jobRole, company);

        String userPrompt = """
        Hi, I’m ready for my interview. Please begin by asking questions based on my resume and the job description.

        Resume:
        {resume}

        Company:
        {company}

        Job Role:
        {job_role}
        """;

        return chatClient.prompt()
                .system(systemPrompt)
                .user( u -> {
                    u.text(userPrompt);
                    u.param("resume", resumeContent);
                    u.param("company", company);
                    u.param("job_role", jobRole);
                })
                .call()
                .content();
    }

}
