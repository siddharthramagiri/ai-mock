package dev.ai.mock.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.ai.mock.entities.ResumeJsonEntity;
import dev.ai.mock.entities.UserEntity;
import dev.ai.mock.records.ResumeContent;
import dev.ai.mock.repository.ResumeJsonRepository;
import dev.ai.mock.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class ResumeFormatService {

    @Autowired
    private ResumeJsonRepository resumeJsonRepository;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;

    public ResponseEntity<ResumeJsonEntity> saveResume(ResumeContent resumeContent, Long userId) {
        if (resumeContent == null) {
            throw new IllegalArgumentException("Resume content cannot be null");
        }

        Optional<UserEntity> optionalUser = userRepository.findById(userId);
        if (optionalUser.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        UserEntity user = optionalUser.get();
        String jsonString = convertToJsonString(resumeContent);

        ResumeJsonEntity resumeJsonEntity = user.getResume();
        if (resumeJsonEntity == null) {
            resumeJsonEntity = new ResumeJsonEntity();
            resumeJsonEntity.setUser(user);
            user.setResume(resumeJsonEntity);
        }

        resumeJsonEntity.setResumeJson(jsonString);

        System.out.println("Resume JSON Entity - ID: " + resumeJsonEntity.getId());
        System.out.println("Resume JSON Entity - User ID: " + resumeJsonEntity.getUser().getId());
        System.out.println("Resume JSON Entity - JSON: " + resumeJsonEntity.getResumeJson());

        // Save the entity - JPA will handle the JSONB conversion
        ResumeJsonEntity savedEntity = resumeJsonRepository.save(resumeJsonEntity);

        return ResponseEntity.ok(savedEntity);
    }

    private String convertToJsonString(ResumeContent resumeContent) {
        try {
            return objectMapper.writeValueAsString(resumeContent);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert ResumeContent to JSON: " + e.getMessage());
        }
    }

    public ResumeContent stringToJSON(String jsonString) {
        try {
            return objectMapper.readValue(jsonString, ResumeContent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert JSON string to ResumeContent: " + e.getMessage());
        }
    }

    public ResumeContent getResume(Long id) {
        Optional<ResumeJsonEntity> optionalEntity = resumeJsonRepository.findById(id);
        if(optionalEntity.isPresent()) {
            ResumeJsonEntity entity = optionalEntity.get();
            String jsonString = entity.getResumeJson();
            ResumeContent resumeContent = stringToJSON(jsonString);

            return resumeContent;
        } else {
            throw new RuntimeException("Failed to get Resume");
        }
    }

}
