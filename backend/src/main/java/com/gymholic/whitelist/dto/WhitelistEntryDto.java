package com.gymholic.whitelist.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WhitelistEntryDto {
    private Long id;
    private String email;
    private String name;
    private String source;
    private boolean notified;
    private LocalDateTime createdAt;
}
