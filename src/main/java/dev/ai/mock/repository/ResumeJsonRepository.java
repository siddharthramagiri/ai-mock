package dev.ai.mock.repository;

import dev.ai.mock.entities.ResumeJsonEntity;
import dev.ai.mock.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResumeJsonRepository extends JpaRepository<ResumeJsonEntity, Long> {

    Optional<ResumeJsonEntity> findByUserId(Long id);
    @Modifying
    @Query(value = "INSERT INTO resumes (user_id, resume_json) VALUES (:userId, CAST(:resumeJson AS jsonb))",
            nativeQuery = true)
    void insertResume(@Param("userId") Long userId, @Param("resumeJson") String resumeJson);

    // Or if updating existing record
    @Modifying
    @Query(value = "UPDATE resumes SET resume_json = CAST(:resumeJson AS jsonb) WHERE user_id = :userId",
            nativeQuery = true)
    void updateResume(@Param("userId") Long userId, @Param("resumeJson") String resumeJson);
}