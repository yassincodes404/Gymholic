package com.gymholic.support.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSupportMessageRequest {

    @NotBlank
    @Size(max = 120)
    private String name;

    @NotBlank
    @Email
    @Size(max = 255)
    private String email;

    @NotBlank
    private String category;

    @NotBlank
    @Size(max = 200)
    private String subject;

    @NotBlank
    @Size(min = 10, max = 5000)
    private String message;
}
