# ── Build Stage ─────────────────────────────────────────────────
FROM maven:3.9.8-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# ── Runtime Stage ────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S traydstream && adduser -S traydstream -G traydstream
COPY --from=build /app/target/*.jar app.jar
RUN mkdir -p /app/uploads && chown -R traydstream:traydstream /app
USER traydstream
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "-Dspring.profiles.active=prod", "app.jar"]
