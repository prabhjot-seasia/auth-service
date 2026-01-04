export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];

  if (!username || username.trim() === '') {
    errors.push('Username is required');
  } else {
    if (username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (username.length > 50) {
      errors.push('Username must be at most 50 characters');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = [];

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (!password || password.trim() === '') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const validateName = (name: string, fieldName: string): ValidationResult => {
  const errors: string[] = [];

  if (!name || name.trim() === '') {
    errors.push(`${fieldName} is required`);
  } else {
    if (name.length < 2) {
      errors.push(`${fieldName} must be at least 2 characters`);
    }
    if (name.length > 100) {
      errors.push(`${fieldName} must be at most 100 characters`);
    }
  }

  return { isValid: errors.length === 0, errors };
};

export const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  let strength = 0;

  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) strength++;

  if (strength <= 2) return { strength, label: 'Weak', color: '#dc3545' };
  if (strength <= 4) return { strength, label: 'Medium', color: '#ffc107' };
  return { strength, label: 'Strong', color: '#28a745' };
};
