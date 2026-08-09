package com.gymholic.settings;

import com.gymholic.common.exception.ResourceNotFoundException;
import com.gymholic.settings.entity.Settings;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SettingsRepository settingsRepository;

    @Transactional(readOnly = true)
    public Map<String, String> getAllSettings() {
        List<Settings> settings = settingsRepository.findAll();
        return settings.stream()
            .collect(Collectors.toMap(Settings::getKey, Settings::getValue));
    }

    @Transactional(readOnly = true)
    public String getSetting(String key) {
        Settings settings = settingsRepository.findByKey(key)
            .orElseThrow(() -> new ResourceNotFoundException("Setting", "key", key));
        return settings.getValue();
    }

    @Transactional
    public void updateSetting(String key, String value) {
        Settings settings = settingsRepository.findByKey(key)
            .orElse(Settings.builder().key(key).build());
        settings.setValue(value);
        settingsRepository.save(settings);
    }
}
