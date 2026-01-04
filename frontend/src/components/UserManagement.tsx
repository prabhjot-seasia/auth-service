import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserManagement.css';
import './shared.css';
import { RequirePermission } from '../contexts/PermissionContext';
import ConfirmationModal from './ConfirmationModal';
import { validateUsername, validateEmail, validatePassword, getPasswordStrength } from '../utils/validation';

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  role?: { id: string; name: string };
  created_at: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

interface Pagination {
  current_page: number;
  limit: number;
  total_users: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface UserCardProps {
  user: User;
  openEditModal: (user: User) => void;
  handleToggleUserStatus: (user: User) => void;
  openPasswordModal: (user: User) => void;
  handleDelete: (userId: string, username: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  openEditModal, 
  handleToggleUserStatus, 
  openPasswordModal,
  handleDelete 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="user-card">
      <div className="user-card-header">
        <h3 className="user-card-title">{user.username}</h3>
        <div className="user-card-header-right">
          <span className={`status user-card-status ${user.is_active ? 'active' : 'inactive'}`}>
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
          <button 
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      <div className="user-card-preview">
        <span className="preview-email">{user.email}</span>
      </div>
      
      {isExpanded && (
        <div className="user-card-body">
          <div className="user-card-field">
            <span className="user-card-label">Name:</span>
            <span className="user-card-value">{user.first_name} {user.last_name}</span>
          </div>
          <div className="user-card-field">
            <span className="user-card-label">Role:</span>
            <span className="user-card-value">{user.role?.name || 'No role assigned'}</span>
          </div>
          <div className="user-card-field">
            <span className="user-card-label">Created:</span>
            <span className="user-card-value">
              {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>
          
          <div className="user-card-actions">
            <div className="primary-actions">
              <RequirePermission action="update" resource="users">
                <button 
                  onClick={() => openEditModal(user)}
                  className="btn-compact btn-edit"
                  title="Edit User"
                >
                  Edit
                </button>
              </RequirePermission>
              <RequirePermission action="update" resource="users">
                <button 
                  onClick={() => handleToggleUserStatus(user)}
                  className={`btn-compact ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                  title={user.is_active ? 'Deactivate User' : 'Activate User'}
                >
                  {user.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </RequirePermission>
            </div>
            <div className="secondary-actions">
              <RequirePermission action="update" resource="users">
                <button 
                  onClick={() => openPasswordModal(user)}
                  className="btn-compact btn-secondary"
                  title="Update Password"
                >
                  Password
                </button>
              </RequirePermission>
              <RequirePermission action="delete" resource="users">
                <button 
                  onClick={() => handleDelete(user.id, user.username)}
                  className="btn-compact btn-delete"
                  title="Delete User"
                >
                  Delete
                </button>
              </RequirePermission>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pagination, setPagination] = useState<Pagination>({
    current_page: 1,
    limit: 50,
    total_users: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    is_active: true,
    role_id: '' as string
  });

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUsers(1); // Reset to page 1 when search/filter changes
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchTerm, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Infinite scroll for all screen sizes
  useEffect(() => {
    const handleScroll = () => {
      // Check if we're near the bottom and have more pages
      if (
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000 &&
        !loadingMore &&
        !loading &&
        pagination.has_next
      ) {
        fetchUsers(pagination.current_page + 1, true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, loading, pagination.has_next, pagination.current_page]);

  // Notification helper
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000); // Auto-hide after 5 seconds
  };

  const fetchUsers = async (page: number = 1, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      
      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      });
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      const response = await axios.get(`http://localhost:8080/users?${params.toString()}`);
      
      if (response.data.users) {
        const newUsers = Array.isArray(response.data.users) ? response.data.users : [];
        if (append) {
          setUsers(prevUsers => [...prevUsers, ...newUsers]);
        } else {
          setUsers(newUsers);
        }
        setPagination(response.data.pagination);
      } else {
        // Fallback for old API response format
        const newUsers = Array.isArray(response.data) ? response.data : [];
        if (append) {
          setUsers(prevUsers => [...prevUsers, ...newUsers]);
        } else {
          setUsers(newUsers);
        }
      }
      setError('');
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
      setError('Failed to fetch users');
      showNotification('Failed to fetch users', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get('http://localhost:8080/roles');
      setRoles(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchUserById = async (userId: string) => {
    try {
      const response = await axios.get(`http://localhost:8080/users/${userId}`);
      return response.data;
    } catch (err) {
      console.error('Failed to fetch user:', err);
      return null;
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setError('');
    setSubmitting(false); // Ensure button is clickable
    setFormData({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      is_active: true,
      role_id: ''
    });
    setShowModal(true);
  };

  const openEditModal = async (user: User) => {
    const fullUser = await fetchUserById(user.id);
    if (fullUser) {
      setEditingUser(fullUser);
      setError('');
      setSubmitting(false); // Ensure button is clickable
      setFormData({
        username: fullUser.username,
        email: fullUser.email,
        password: '', // Don't prefill password
        first_name: fullUser.first_name,
        last_name: fullUser.last_name,
        is_active: fullUser.is_active,
        role_id: fullUser.role?.id || ''
      });
      setShowModal(true);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
    setFieldErrors({});
    setSubmitting(false);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors: {[key: string]: string} = {};

    if (!editingUser) {
      const usernameValidation = validateUsername(formData.username);
      if (!usernameValidation.isValid) {
        errors.username = usernameValidation.errors.join('; ');
      }

      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        errors.password = passwordValidation.errors.join('; ');
      }
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.errors.join('; ');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      if (editingUser) {
        const updateData: any = {
          email: formData.email,
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_active: formData.is_active
        };

        await axios.put(`http://localhost:8080/users/${editingUser.id}`, updateData);

        if (formData.role_id !== (editingUser.role?.id || '')) {
          await axios.put(`http://localhost:8080/users/${editingUser.id}/role`, {
            role_id: formData.role_id || null
          });
        }
      } else {
        const createData: any = {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name
        };

        const userResponse = await axios.post('http://localhost:8080/users', createData);

        if (formData.role_id && userResponse.data.id) {
          await axios.put(`http://localhost:8080/users/${userResponse.data.id}/role`, {
            role_id: formData.role_id
          });
        }
      }

      await fetchUsers();
      closeModal();
      showNotification(editingUser ? 'User updated successfully' : 'User created successfully', 'success');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Operation failed';
      const field = err.response?.data?.field;
      if (field) {
        setFieldErrors({ [field]: errorMsg });
      } else {
        setError(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (userId: string, username: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete User',
      message: `Are you sure you want to delete user "${username}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: () => performDelete(userId)
    });
  };

  const performDelete = async (userId: string) => {
    try {
      await axios.delete(`http://localhost:8080/users/${userId}`);
      await fetchUsers();
      setConfirmModal({ ...confirmModal, isOpen: false });
      showNotification('User deleted successfully', 'success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
      setConfirmModal({ ...confirmModal, isOpen: false });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validate on blur
    if (name === 'username' && !editingUser) {
      const validation = validateUsername(value);
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, username: validation.errors.join('; ') }));
      }
    } else if (name === 'email') {
      const validation = validateEmail(value);
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, email: validation.errors.join('; ') }));
      }
    } else if (name === 'password' && !editingUser && value) {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, password: validation.errors.join('; ') }));
      }
    }
  };

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      role_id: event.target.value
    }));
  };

  // Toggle user active/inactive status
  const handleToggleUserStatus = (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} user "${user.username}"?`;
    
    setConfirmModal({
      isOpen: true,
      title: `${action === 'activate' ? 'Activate' : 'Deactivate'} User`,
      message: confirmMessage,
      type: user.is_active ? 'warning' : 'info',
      onConfirm: () => performToggleUserStatus(user)
    });
  };

  const performToggleUserStatus = async (user: User) => {
    const action = user.is_active ? 'deactivate' : 'activate';
    try {
      setSubmitting(true);
      await axios.put(`http://localhost:8080/users/${user.id}`, {
        ...user,
        is_active: !user.is_active
      });
      await fetchUsers();
      showNotification(`User ${user.username} has been ${user.is_active ? 'deactivated' : 'activated'} successfully`, 'success');
      setConfirmModal({ ...confirmModal, isOpen: false });
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action} user`);
      showNotification(`Failed to ${action} user`, 'error');
      setConfirmModal({ ...confirmModal, isOpen: false });
    } finally {
      setSubmitting(false);
    }
  };

  // Open password modal
  const openPasswordModal = (user: User) => {
    setPasswordUser(user);
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordUser(null);
    setPasswordData({
      newPassword: '',
      confirmPassword: ''
    });
    setError('');
    setFieldErrors({});
  };

  const handleUpdatePassword = async () => {
    if (!passwordUser) return;

    setError('');
    setFieldErrors({});

    const errors: {[key: string]: string} = {};

    if (!passwordData.newPassword) {
      errors.newPassword = 'Please enter a new password';
    } else {
      const passwordValidation = validatePassword(passwordData.newPassword);
      if (!passwordValidation.isValid) {
        errors.newPassword = passwordValidation.errors.join('; ');
      }
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setSubmitting(true);

      await axios.put(`http://localhost:8080/users/${passwordUser.id}`, {
        ...passwordUser,
        password: passwordData.newPassword
      });

      showNotification(`Password updated successfully for user ${passwordUser.username}`, 'success');
      closePasswordModal();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to update password';
      const field = err.response?.data?.field;
      if (field === 'password') {
        setFieldErrors({ newPassword: errorMsg });
      } else {
        setError(errorMsg);
      }
      showNotification('Failed to update password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle password field blur for validation
  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'newPassword' && value) {
      const validation = validatePassword(value);
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, newPassword: validation.errors.join('; ') }));
      }
    } else if (name === 'confirmPassword' && value) {
      if (passwordData.newPassword !== value) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      }
    }
  };

  // No pagination functions needed with infinite scroll

  // CSV functions
  const downloadCSV = async () => {
    try {
      const response = await axios.get('http://localhost:8080/users/export/csv', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      console.error('Failed to download CSV:', err);
      setError('Failed to download CSV file');
    }
  };

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const response = await axios.post(`http://localhost:8080/users/import/csv`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      showNotification(
        `${response.data.message}. Successful: ${response.data.success_count}, Failed: ${response.data.error_count}`,
        response.data.error_count > 0 ? 'error' : 'success'
      );
      fetchUsers(pagination.current_page);
      event.target.value = ''; // Reset file input
    } catch (err: any) {
      console.error('Failed to import CSV:', err);
      showNotification('Failed to import users from CSV', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove the hardcoded admin check - now using granular permissions
  // Users with read:users can view the list, action buttons are controlled by RequirePermission

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Management</h2>
        <div className="header-actions">
          <RequirePermission action="create" resource="users">
            <button onClick={openCreateModal} className="btn-primary btn-small">
              Create User
            </button>
          </RequirePermission>
          <RequirePermission action="read" resource="users">
            <button onClick={downloadCSV} className="btn-secondary btn-small">
              Export CSV
            </button>
          </RequirePermission>
          <RequirePermission action="create" resource="users">
            <label className="btn-upload">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleCSVUpload}
                style={{display: 'none'}}
              />
              <span className="btn-secondary btn-small">Import CSV</span>
            </label>
          </RequirePermission>
        </div>
      </div>

      {/* Notification Bar */}
      {notification && (
        <div className={`notification-bar notification-${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close" 
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="status-filter"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-message">Loading users...</div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? users.map(user => (
                  <tr key={user.id} className={`user-row ${user.is_active ? 'active-user' : 'inactive-user'}`}>
                    <td>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewDetails(user);
                        }}
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {user.username}
                      </a>
                    </td>
                    <td>{user.role?.name || 'No role assigned'}</td>
                    <td className="actions">
                      <div className="action-buttons">
                        <RequirePermission action="update" resource="users">
                          <button 
                            onClick={() => openEditModal(user)}
                            className="btn-icon btn-edit"
                            title="Edit User"
                          >
                            ✏️
                          </button>
                        </RequirePermission>
                        <RequirePermission action="update" resource="users">
                          <button 
                            onClick={() => handleToggleUserStatus(user)}
                            className={`btn-icon ${user.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            {user.is_active ? '🔒' : '🔓'}
                          </button>
                        </RequirePermission>
                        <RequirePermission action="update" resource="users">
                          <button 
                            onClick={() => openPasswordModal(user)}
                            className="btn-icon btn-password"
                            title="Update Password"
                          >
                            🔑
                          </button>
                        </RequirePermission>
                        <RequirePermission action="delete" resource="users">
                          <button 
                            onClick={() => handleDelete(user.id, user.username)}
                            className="btn-icon btn-delete"
                            title="Delete User"
                          >
                            🗑️
                          </button>
                        </RequirePermission>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="no-users">No users found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="users-cards">
            {users.length > 0 ? users.map(user => (
              <UserCard 
                key={user.id} 
                user={user}
                openEditModal={openEditModal}
                handleToggleUserStatus={handleToggleUserStatus}
                openPasswordModal={openPasswordModal}
                handleDelete={handleDelete}
              />
            )) : (
              <div className="no-users-card">No users found</div>
            )}
          </div>

          {/* Loading More Indicator for Infinite Scroll */}
          {loadingMore && (
            <div className="loading-more">
              <div className="loading-spinner"></div>
              <span>Loading more users...</span>
            </div>
          )}
          
          {/* Simple pagination info - no controls needed with infinite scroll */}
          {pagination.total_users > 0 && (
            <div className="pagination-info-simple">
              <span className="info-text">
                Showing {users.length} of {pagination.total_users} users
                {pagination.has_next && <span> • Scroll down for more</span>}
              </span>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={closeModal} className="close-btn">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="user-form" noValidate>
              <div className={`form-group ${fieldErrors.username ? 'has-error' : ''}`}>
                <label htmlFor="username">Username *</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  disabled={editingUser !== null}
                  className={fieldErrors.username ? 'input-error' : ''}
                />
                {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
              </div>

              <div className={`form-group ${fieldErrors.email ? 'has-error' : ''}`}>
                <label htmlFor="email">Email *</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  value={formData.email}
                  onChange={handleInputChange}
                  onBlur={handleBlur}
                  className={fieldErrors.email ? 'input-error' : ''}
                />
                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
              </div>

              {!editingUser && (
                <div className={`form-group ${fieldErrors.password ? 'has-error' : ''}`}>
                  <label htmlFor="password">Password *</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={fieldErrors.password ? 'input-error' : ''}
                  />
                  {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="toggle-container">
                  <label htmlFor="is_active" className="toggle-switch">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <label htmlFor="is_active">Active User</label>
                </div>
              </div>

              {roles.length > 0 && (
                <div className="form-group">
                  <label htmlFor="role">Role</label>
                  <select
                    id="role"
                    value={formData.role_id}
                    onChange={handleRoleChange}
                    className="role-select"
                  >
                    <option value="">Select a role</option>
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                  <small className="form-help">
                    {formData.role_id 
                      ? `Selected: ${roles.find(r => r.id === formData.role_id)?.name || 'Unknown role'}`
                      : 'No role selected'
                    }
                  </small>
                </div>
              )}

              <div className="form-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Update Modal */}
      {showPasswordModal && passwordUser && (
        <div className="modal-overlay">
          <div className="modal password-modal">
            <div className="modal-header">
              <h3>🔑 Update Password for {passwordUser.username}</h3>
              <button onClick={closePasswordModal} className="close-btn">&times;</button>
            </div>
            
            <div className="user-form">

              <form onSubmit={(e) => { e.preventDefault(); handleUpdatePassword(); }} noValidate>
              <div className={`form-group ${fieldErrors.newPassword ? 'has-error' : ''}`}>
                <label htmlFor="newPassword">New Password *</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Enter new password"
                  className={fieldErrors.newPassword ? 'input-error' : ''}
                />
                {fieldErrors.newPassword && <span className="field-error">{fieldErrors.newPassword}</span>}
                <div className="password-requirements">
                  <strong>Password Requirements:</strong>
                  <ul>
                    <li>Minimum 8 characters</li>
                    <li>At least one uppercase letter</li>
                    <li>At least one lowercase letter</li>
                    <li>At least one number</li>
                    <li>At least one special character (!@#$%^&* etc.)</li>
                  </ul>
                </div>
              </div>

              <div className={`form-group ${fieldErrors.confirmPassword ? 'has-error' : ''}`}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  placeholder="Confirm new password"
                  className={fieldErrors.confirmPassword ? 'input-error' : ''}
                />
                {fieldErrors.confirmPassword && <span className="field-error">{fieldErrors.confirmPassword}</span>}
              </div>

              {!fieldErrors.confirmPassword && passwordData.newPassword && passwordData.confirmPassword && (
                passwordData.newPassword === passwordData.confirmPassword ? (
                  <div className="password-match-success">
                    ✓ Passwords match
                  </div>
                ) : (
                  <div className="password-match-error">
                    Passwords do not match
                  </div>
                )
              )}
              
              <div className="form-actions">
                <button type="button" onClick={closePasswordModal} className="btn-secondary">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={
                    submitting || 
                    !passwordData.newPassword || 
                    !passwordData.confirmPassword ||
                    passwordData.newPassword !== passwordData.confirmPassword
                  }
                  className="btn-primary"
                >
                  {submitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Details for User "{selectedUser.username}"</h3>
              <button className="close-btn" onClick={handleCloseDetailsModal}>×</button>
            </div>
            
            <div className="user-form">
              {/* User Information Section */}
              <div className="permissions-view-section">
                <h4>User Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Username:</strong> {selectedUser.username}
                  </div>
                  <div className="info-item">
                    <strong>Email:</strong> {selectedUser.email}
                  </div>
                  <div className="info-item">
                    <strong>Full Name:</strong> {selectedUser.first_name} {selectedUser.last_name}
                  </div>
                  <div className="info-item">
                    <strong>Status:</strong> 
                    <span className={`status ${selectedUser.is_active ? 'active' : 'inactive'}`} style={{ marginLeft: '0.5rem' }}>
                      {selectedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="info-item">
                    <strong>Created:</strong> {new Date(selectedUser.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Role Assignment Section */}
              <div className="permissions-view-section">
                <h4>Role Assignment</h4>
                {selectedUser.role ? (
                  <div className="group-membership-card">
                    <div className="group-header">
                      <h5>{selectedUser.role.name}</h5>
                      <span className="group-description">Assigned role for this user</span>
                    </div>
                  </div>
                ) : (
                  <p className="no-permissions">No role assigned to this user</p>
                )}
              </div>

              {/* System Information */}
              <div className="role-info-section">
                <h4>System Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>User ID:</strong> 
                    <span style={{ fontFamily: 'monospace', fontSize: '0.9em', wordBreak: 'break-all' }}>
                      {selectedUser.id}
                    </span>
                  </div>
                  <div className="info-item">
                    <strong>Account Status:</strong> {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </div>
                  <div className="info-item">
                    <strong>Registration Date:</strong> {new Date(selectedUser.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button 
                  type="button"
                  onClick={handleCloseDetailsModal}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      />
    </div>
  );
};