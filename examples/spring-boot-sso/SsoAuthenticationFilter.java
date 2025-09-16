package com.example.documentservice.filter;

import com.example.documentservice.sso.SsoClient;
import com.example.documentservice.sso.TokenValidationResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class SsoAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private SsoClient ssoClient;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                    HttpServletResponse response, 
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            // Validate token with SSO service
            TokenValidationResponse validation = ssoClient.validateToken(token);
            
            if (validation.isValid()) {
                // Create Spring Security authentication
                List<SimpleGrantedAuthority> authorities = validation.getRoles().stream()
                    .map(role -> new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()))
                    .collect(Collectors.toList());
                
                // Add permissions as authorities too
                validation.getPermissions().forEach(permission -> {
                    authorities.add(new SimpleGrantedAuthority(
                        permission.getResource() + ":" + permission.getAction()
                    ));
                });
                
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        validation.getUsername(),
                        null,
                        authorities
                    );
                
                // Store additional user info in authentication details
                authentication.setDetails(validation);
                
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}