package com.traydstream.dto.response;

import com.traydstream.entity.enums.RoleType;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private RoleType role;
    private Boolean isActive;
    private Instant createdAt;
    private Instant updatedAt;
}
