package com.example.documentservice.controller;

import com.example.documentservice.sso.SsoClient;
import com.example.documentservice.sso.TokenValidationResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    
    @Autowired
    private SsoClient ssoClient;
    
    // Public endpoint - no authentication required
    @GetMapping("/public")
    public Map<String, Object> getPublicDocuments() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Public documents accessible without authentication");
        response.put("documents", new String[]{"public-doc-1", "public-doc-2"});
        return response;
    }
    
    // Protected endpoint - requires authentication
    @GetMapping("/protected")
    public Map<String, Object> getProtectedDocuments(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Protected documents for authenticated users");
        response.put("username", authentication.getName());
        response.put("authorities", authentication.getAuthorities());
        
        // Get user details from authentication
        if (authentication.getDetails() instanceof TokenValidationResponse) {
            TokenValidationResponse userInfo = (TokenValidationResponse) authentication.getDetails();
            response.put("email", userInfo.getEmail());
            response.put("roles", userInfo.getRoles());
        }
        
        return response;
    }
    
    // Endpoint requiring specific permission
    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('documents:write')")
    public Map<String, Object> getAdminDocuments(Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Admin documents - requires documents:write permission");
        response.put("username", authentication.getName());
        return response;
    }
    
    // Create document - requires write permission
    @PostMapping
    @PreAuthorize("hasAuthority('documents:write')")
    public Map<String, Object> createDocument(@RequestBody Map<String, Object> document,
                                               Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Document created successfully");
        response.put("document", document);
        response.put("createdBy", authentication.getName());
        return response;
    }
    
    // Read document - requires read permission
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('documents:read')")
    public Map<String, Object> getDocument(@PathVariable String id,
                                            Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Document retrieved successfully");
        response.put("documentId", id);
        response.put("accessedBy", authentication.getName());
        return response;
    }
    
    // Delete document - requires write permission
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('documents:write')")
    public Map<String, Object> deleteDocument(@PathVariable String id,
                                               Authentication authentication) {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Document deleted successfully");
        response.put("documentId", id);
        response.put("deletedBy", authentication.getName());
        return response;
    }
    
    // Check user permissions dynamically
    @GetMapping("/check-permission")
    public Map<String, Object> checkPermission(@RequestParam String resource,
                                                @RequestParam String action,
                                                @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.substring(7); // Remove "Bearer " prefix
        
        var permissionCheck = ssoClient.checkPermission(token, resource, action);
        
        Map<String, Object> response = new HashMap<>();
        response.put("resource", resource);
        response.put("action", action);
        response.put("allowed", permissionCheck.isAllowed());
        
        return response;
    }
}