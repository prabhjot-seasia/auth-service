package sso

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// Client represents an SSO client for external services
type Client struct {
	AuthServiceURL string
	HTTPClient     *http.Client
}

// NewClient creates a new SSO client
func NewClient(authServiceURL string) *Client {
	return &Client{
		AuthServiceURL: strings.TrimSuffix(authServiceURL, "/"),
		HTTPClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// UserInfo represents user information from SSO validation
type UserInfo struct {
	Valid       bool                    `json:"valid"`
	UserID      string                  `json:"user_id,omitempty"`
	Username    string                  `json:"username,omitempty"`
	Email       string                  `json:"email,omitempty"`
	Roles       []string                `json:"roles,omitempty"`
	Groups      []string                `json:"groups,omitempty"`
	Permissions []Permission            `json:"permissions,omitempty"`
	ExpiresAt   int64                   `json:"expires_at,omitempty"`
	Error       string                  `json:"error,omitempty"`
}

type Permission struct {
	Resource string `json:"resource"`
	Action   string `json:"action"`
}

// ValidateToken validates a JWT token with the auth service
func (c *Client) ValidateToken(token string) (*UserInfo, error) {
	reqBody := map[string]string{
		"token": token,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.AuthServiceURL+"/sso/validate",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var userInfo UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &userInfo, nil
}

// ValidateTokenFromHeader validates a token from Authorization header
func (c *Client) ValidateTokenFromHeader(authHeader string) (*UserInfo, error) {
	req, err := http.NewRequest("GET", c.AuthServiceURL+"/sso/validate", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", authHeader)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var userInfo UserInfo
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &userInfo, nil
}

// CheckPermission checks if a user has a specific permission
func (c *Client) CheckPermission(token, resource, action string) (bool, error) {
	reqBody := map[string]string{
		"token":    token,
		"resource": resource,
		"action":   action,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return false, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.AuthServiceURL+"/sso/check-permission",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return false, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Allowed bool   `json:"allowed"`
		Error   string `json:"error,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("failed to decode response: %w", err)
	}

	if result.Error != "" {
		return false, fmt.Errorf("permission check failed: %s", result.Error)
	}

	return result.Allowed, nil
}

// ServiceLogin performs SSO login for a service
func (c *Client) ServiceLogin(username, password, serviceID, redirectURI string) (*LoginResponse, error) {
	reqBody := map[string]string{
		"username":     username,
		"password":     password,
		"service_id":   serviceID,
		"redirect_uri": redirectURI,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.AuthServiceURL+"/sso/login",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var loginResp LoginResponse
	if err := json.NewDecoder(resp.Body).Decode(&loginResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &loginResp, nil
}

type LoginResponse struct {
	Success     bool   `json:"success"`
	AccessToken string `json:"access_token,omitempty"`
	RedirectURI string `json:"redirect_uri,omitempty"`
	Error       string `json:"error,omitempty"`
}

// Logout logs out a user from SSO
func (c *Client) Logout(token string) error {
	reqBody := map[string]string{
		"token": token,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	resp, err := c.HTTPClient.Post(
		c.AuthServiceURL+"/sso/logout",
		"application/json",
		bytes.NewBuffer(jsonData),
	)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool   `json:"success"`
		Error   string `json:"error,omitempty"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode response: %w", err)
	}

	if !result.Success {
		return fmt.Errorf("logout failed: %s", result.Error)
	}

	return nil
}