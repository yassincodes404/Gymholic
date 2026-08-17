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

    /** Reads a setting with a fallback — never throws (errors fall back). */
    @Transactional(readOnly = true)
    public String getString(String key, String fallback) {
        try {
            Settings settings = settingsRepository.findByKey(key).orElse(null);
            if (settings == null || settings.getValue() == null || settings.getValue().isBlank()) {
                return fallback;
            }
            return settings.getValue().trim();
        } catch (Exception e) {
            return fallback;
        }
    }

    @Transactional(readOnly = true)
    public boolean getBool(String key, boolean fallback) {
        String value = getString(key, Boolean.toString(fallback));
        return value.equalsIgnoreCase("true") || value.equalsIgnoreCase("1") || value.equalsIgnoreCase("yes");
    }

    @Transactional(readOnly = true)
    public int getInt(String key, int fallback) {
        try {
            return Integer.parseInt(getString(key, Integer.toString(fallback)));
        } catch (NumberFormatException e) {
            return fallback;
        }
    }

    @Transactional
    public void updateSetting(String key, String value) {
        // The whole platform (gates, emails, Paymob calls) is USD-only;
        // keep the currency setting from drifting to anything else.
        if ("BOOKING_CURRENCY".equals(key)) {
            value = "USD";
        }
        Settings settings = settingsRepository.findByKey(key)
            .orElse(Settings.builder().key(key).build());
        settings.setValue(value);
        settingsRepository.save(settings);
    }
}
