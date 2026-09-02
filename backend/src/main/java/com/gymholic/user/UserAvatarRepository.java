package com.gymholic.user;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {

    Optional<UserAvatar> findByUserId(Long userId);

    void deleteByUserId(Long userId);
}
