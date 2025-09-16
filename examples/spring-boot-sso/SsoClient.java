package com.example.documentservice.sso;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class SsoClient {
    
    private final String authServiceUrl;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    
    public SsoClient(String authServiceUrl, RestTemplate restTemplate) {
        this.authServiceUrl = authServiceUrl;
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }
    
    public TokenValidationResponse validateToken(String token) {
        String url = authServiceUrl + "/sso/validate";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        try {
            ResponseEntity<TokenValidationResponse> response = restTemplate.exchange(
                url, 
                HttpMethod.GET, 
                entity, 
                TokenValidationResponse.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            return TokenValidationResponse.invalid(e.getMessage());
        }
    }
    
    public PermissionCheckResponse checkPermission(String token, String resource, String action) {
        String url = authServiceUrl + "/sso/check-permission";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, String> request = new HashMap<>();
        request.put("token", token);
        request.put("resource", resource);
        request.put("action", action);
        
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
        
        try {
            ResponseEntity<PermissionCheckResponse> response = restTemplate.postForEntity(
                url, 
                entity, 
                PermissionCheckResponse.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            return new PermissionCheckResponse(false, e.getMessage());
        }
    }
    
    public LoginResponse login(String username, String password, String serviceId, String redirectUri) {
        String url = authServiceUrl + "/sso/login";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, String> request = new HashMap<>();
        request.put("username", username);
        request.put("password", password);
        request.put("service_id", serviceId);
        if (redirectUri != null) {
            request.put("redirect_uri", redirectUri);
        }
        
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
        
        try {
            ResponseEntity<LoginResponse> response = restTemplate.postForEntity(
                url, 
                entity, 
                LoginResponse.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            return new LoginResponse(false, null, null, e.getMessage());
        }
    }
    
    public LogoutResponse logout(String token) {
        String url = authServiceUrl + "/sso/logout";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        Map<String, String> request = new HashMap<>();
        request.put("token", token);
        
        HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
        
        try {
            ResponseEntity<LogoutResponse> response = restTemplate.postForEntity(
                url, 
                entity, 
                LogoutResponse.class
            );
            
            return response.getBody();
        } catch (Exception e) {
            return new LogoutResponse(false, e.getMessage());
        }
    }
}

// Response DTOs
class TokenValidationResponse {
    private boolean valid;
    private String userId;
    private String username;
    private String email;
    private List<String> roles;
    private List<String> groups;
    private List<Permission> permissions;
    private long expiresAt;
    private String error;
    
    // Constructors, getters, and setters
    public TokenValidationResponse() {}
    
    public static TokenValidationResponse invalid(String error) {
        TokenValidationResponse response = new TokenValidationResponse();
        response.valid = false;
        response.error = error;
        return response;
    }
    
    // Getters and setters
    public boolean isValid() { return valid; }
    public void setValid(boolean valid) { this.valid = valid; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public List<String> getRoles() { return roles; }
    public void setRoles(List<String> roles) { this.roles = roles; }
    
    public List<String> getGroups() { return groups; }
    public void setGroups(List<String> groups) { this.groups = groups; }
    
    public List<Permission> getPermissions() { return permissions; }
    public void setPermissions(List<Permission> permissions) { this.permissions = permissions; }
    
    public long getExpiresAt() { return expiresAt; }
    public void setExpiresAt(long expiresAt) { this.expiresAt = expiresAt; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

class Permission {
    private String resource;
    private String action;
    
    public Permission() {}
    
    public Permission(String resource, String action) {
        this.resource = resource;
        this.action = action;
    }
    
    public String getResource() { return resource; }
    public void setResource(String resource) { this.resource = resource; }
    
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}

class PermissionCheckResponse {
    private boolean allowed;
    private String error;
    
    public PermissionCheckResponse() {}
    
    public PermissionCheckResponse(boolean allowed, String error) {
        this.allowed = allowed;
        this.error = error;
    }
    
    public boolean isAllowed() { return allowed; }
    public void setAllowed(boolean allowed) { this.allowed = allowed; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

class LoginResponse {
    private boolean success;
    private String accessToken;
    private String redirectUri;
    private String error;
    
    public LoginResponse() {}
    
    public LoginResponse(boolean success, String accessToken, String redirectUri, String error) {
        this.success = success;
        this.accessToken = accessToken;
        this.redirectUri = redirectUri;
        this.error = error;
    }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getAccessToken() { return accessToken; }
    public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    
    public String getRedirectUri() { return redirectUri; }
    public void setRedirectUri(String redirectUri) { this.redirectUri = redirectUri; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}

class LogoutResponse {
    private boolean success;
    private String error;
    
    public LogoutResponse() {}
    
    public LogoutResponse(boolean success, String error) {
        this.success = success;
        this.error = error;
    }
    
    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }
    
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
}