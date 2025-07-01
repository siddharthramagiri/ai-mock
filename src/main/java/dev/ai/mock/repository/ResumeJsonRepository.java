package dev.ai.mock.repository;

import dev.ai.mock.entities.ResumeJsonEntity;
import dev.ai.mock.entities.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResumeJsonRepository extends JpaRepository<ResumeJsonEntity, Long> {

    Optional<ResumeJsonEntity> findByUserId(Long id);

}