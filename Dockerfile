# Use Java 21 compatible Maven image for the build stage
FROM maven:3.9.8-eclipse-temurin-17 AS build

# Set working directory inside the container
WORKDIR /app

# Copy only the pom.xml first (to leverage Docker cache)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copy the source code and build the application
COPY src ./src
RUN mvn clean package -DskipTests

# Runtime stage - Use Eclipse Temurin Java 21 JRE for consistency
FROM eclipse-temurin:17-jre AS runtime

# Working directory for the runtime container
WORKDIR /app

# Copy the jar file from the build stage and list target directory for debugging
COPY --from=build /app/target/*.jar app.jar
COPY models/model.onnx /app/models/all-MiniLM-L6-v2.onnx

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Set JVM heap size for Spring AI
ENV JAVA_OPTS="-Xms512m -Xmx2g"

# Command to run your application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]

