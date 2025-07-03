package dev.ai.mock.entities;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;


@Data
@Getter
@Setter
@RequiredArgsConstructor
@Entity
@Table(name = "resumes")
public class ResumeJsonEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "resume_json", columnDefinition = "TEXT")
    @JdbcTypeCode(SqlTypes.JSON)
    private String resumeJson;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    @JsonBackReference
    private UserEntity user;

    public UserEntity getUser() {
        return user;
    }

    public void setUser(UserEntity user) {
        this.user = user;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getResumeJson() {
        return resumeJson;
    }

    public void setResumeJson(String resumeJson) {
        this.resumeJson = resumeJson;
    }
}