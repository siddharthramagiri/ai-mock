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

import java.util.Optional;

@Service
public class ResumeFormatService {

    @Autowired
    private ResumeJsonRepository resumeJsonRepository;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;


    public ResponseEntity<ResumeJsonEntity> saveResume(ResumeContent resumeContent, Long id) {
        Optional<UserEntity> optionalUser = userRepository.findById(id);
        if (optionalUser.isPresent()) {
            UserEntity user = optionalUser.get();

            String jsonString = JSONToString(resumeContent);

            ResumeJsonEntity resumeJsonEntity = user.getResume();
            if (resumeJsonEntity == null) {
                resumeJsonEntity = new ResumeJsonEntity();
                resumeJsonEntity.setUser(user);
                user.setResume(resumeJsonEntity);
            }

            resumeJsonEntity.setResumeJson(jsonString);

            resumeJsonRepository.save(resumeJsonEntity);
            userRepository.save(user);

            return ResponseEntity.ok(resumeJsonEntity);
        }
        return ResponseEntity.noContent().build();
    }

    public String JSONToString(ResumeContent resumeContent) {
        try {
            return objectMapper.writeValueAsString(resumeContent);
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }

    public ResumeContent stringToJSON(String jsonString) {
        try {
            return objectMapper.readValue(jsonString, ResumeContent.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert into JSON");
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
