package dev.ai.mock.records;

import java.util.List;

public record ResumeContent(
        String candidateName,
        String location,
        List<String> contactDetails,
        List<String> links,
        String careerObjective,
        List<String> skills,
        List<Education> education,
        List<WorkExperience> workExperience,
        List<String> internships,
        List<Project> projects,
        List<String> certifications
) {
}
