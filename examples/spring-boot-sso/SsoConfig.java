package com.example.documentservice.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestTemplate;

@Configuration
public class SsoConfig {
    
    @Value("${sso.auth-service.url:http://localhost:8080}")
    private String authServiceUrl;
    
    @Value("${sso.service.id:22222222-2222-2222-2222-222222222222}")
    private String serviceId;
    
    @Value("${sso.service.client-id:doc-service-client-id-123456}")
    private String clientId;
    
    @Value("${sso.service.client-secret:DocService@Secret123}")
    private String clientSecret;
    
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
    
    @Bean
    public SsoClient ssoClient() {
        return new SsoClient(authServiceUrl, restTemplate());
    }
}