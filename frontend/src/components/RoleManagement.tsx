import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../provider/authProvider';
import { RequirePermission, usePermissions } from '../contexts/PermissionContext';
import './UserManagement.css';
import './shared.css';
import ConfirmationModal from './ConfirmationModal';
import { validateName } from '../utils/validation';

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  groups?: Group[];
  effective_permissions?: Permission[];
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  resource: string;
  action: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface RoleCardProps {
  role: Role;
  openEditModal: (role: Role) => void;
  openGroupModal: (role: Role) => void;
  openPermissionModal: (role: Role) => void;
  handleDelete: (roleId: string, roleName: string) => void;
  canWriteRoles: boolean;
}

const RoleCard: React.FC<RoleCardProps> = ({ 
  role, 
  openEditModal, 
  openGroupModal, 
  openPermissionModal, 
  handleDelete,
  canWriteRoles
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="user-card">
      <div className="user-card-header">
        <h3 className="user-card-title">{role.name}</h3>
        <div className="user-card-header-right">
          <span className={`status user-card-status ${role.permissions?.length ? 'active' : 'inactive'}`}>
            {role.permissions?.length || 0} permissions
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
        <span className="preview-email">{role.description}</span>
      </div>
      
      {isExpanded && (
        <div className="user-card-body">
          <div className="user-card-field">
            <span className="user-card-label">Groups:</span>
            <span className="user-card-value">
              {role.groups?.length ? role.groups.map(g => g.name).join(', ') : 'No groups assigned'}
            </span>
          </div>
          <div className="user-card-field">
            <span className="user-card-label">Created:</span>
            <span className="user-card-value">
              {new Date(role.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {canWriteRoles && (
            <div className="user-card-actions">
              <div className="primary-actions">
                <button 
                  onClick={() => openEditModal(role)}
                  className="btn-compact btn-edit"
                  title="Edit Role"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openGroupModal(role)}
                  className="btn-compact btn-role"
                  title="Manage Groups"
                >
                  Groups
                </button>
              </div>
              <div className="secondary-actions">
                <button 
                  onClick={() => openPermissionModal(role)}
                  className="btn-compact btn-secondary"
                  title="View Permissions"
                >
                  Permissions
                </button>
                <button 
                  onClick={() => handleDelete(role.id, role.name)}
                  className="btn-compact btn-delete"
                  title="Delete Role"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RoleManagement: React.FC = () => {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [managingRoleId, setManagingRoleId] = useState<string | null>(null);
  const [viewingRole, setViewingRole] = useState<Role | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});
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
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Check permission-based access
  const { hasPermission } = usePermissions();
  const canReadRoles = hasPermission('read', 'roles');
  const canWriteRoles = hasPermission('write', 'roles');
  const hasAnyRolePermission = canReadRoles || canWriteRoles;

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(API_URL + '/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const rolesData = Array.isArray(response.data) ? response.data : [];
      setRoles(rolesData);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
      showNotification('Error fetching roles', 'error');
      setRoles([]);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(API_URL + '/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      showNotification('Error fetching groups', 'error');
      setGroups([]);
    }
  };

  const fetchRoleGroups = async (roleId: string) => {
    try {
      const response = await axios.get(`${API_URL}/roles/${roleId}/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const roleGroups = Array.isArray(response.data) ? response.data : [];
      setSelectedGroups(roleGroups.map((g: Group) => g.id));
    } catch (error: any) {
      console.error('Error fetching role groups:', error);
      showNotification('Error fetching role groups', 'error');
      setSelectedGroups([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchRoles(), fetchGroups()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setSelectedGroups([]);
    setWizardStep(1);
    setShowModal(true);
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({ name: role.name, description: role.description });
    setSelectedGroups([]);
    setWizardStep(1);
    setShowModal(true);
  };

  const handleManageGroups = async (role: Role) => {
    setManagingRoleId(role.id);
    await fetchRoleGroups(role.id);
    setShowGroupModal(true);
  };

  const handleDelete = async (role: Role) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Role',
      message: `Are you sure you want to delete the role "${role.name}"?`,
      type: 'danger',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await axios.delete(`${API_URL}/roles/${role.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          showNotification('Role deleted successfully', 'success');
          await fetchRoles();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error('Error deleting role:', error);
          showNotification(error.response?.data?.error || 'Error deleting role', 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormData({ name: '', description: '' });
    setSelectedGroups([]);
    setWizardStep(1);
    setFieldErrors({});
  };

  const handleCloseGroupModal = () => {
    setShowGroupModal(false);
    setManagingRoleId(null);
    setSelectedGroups([]);
  };

  const handleViewPermissions = (role: Role) => {
    setViewingRole(role);
    setShowPermissionModal(true);
  };

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false);
    setViewingRole(null);
  };

  const handleNextStep = () => {
    setFieldErrors({});
    const nameValidation = validateName(formData.name, 'Role name');
    if (!nameValidation.isValid) {
      setFieldErrors({ name: nameValidation.errors.join('; ') });
      return;
    }
    setWizardStep(2);
  };

  const handlePreviousStep = () => {
    setWizardStep(1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    if (name === 'name' && value) {
      const validation = validateName(value, 'Role name');
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, name: validation.errors.join('; ') }));
      }
    }
  };

  const handleGroupSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selectedValues: string[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedGroups(selectedValues);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const nameValidation = validateName(formData.name, 'Role name');
    if (!nameValidation.isValid) {
      setFieldErrors({ name: nameValidation.errors.join('; ') });
      return;
    }

    setSubmitting(true);
    try {
      const roleData = {
        name: formData.name,
        description: formData.description
      };

      let roleId: string;

      if (editingRole) {
        await axios.put(`${API_URL}/roles/${editingRole.id}`, roleData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        roleId = editingRole.id;
        showNotification('Role updated successfully', 'success');
      } else {
        const response = await axios.post(API_URL + '/roles', roleData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        roleId = response.data.id;

        if (selectedGroups.length > 0) {
          await axios.put(`${API_URL}/roles/${roleId}/groups`, {
            group_ids: selectedGroups
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }
        showNotification('Role created successfully', 'success');
      }

      await fetchRoles();
      handleCloseModal();
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Error saving role';
      const field = error.response?.data?.field;
      if (field) {
        setFieldErrors({ [field]: errorMsg });
      } else {
        showNotification(errorMsg, 'error');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingRoleId) return;

    setSubmitting(true);
    try {
      await axios.put(`${API_URL}/roles/${managingRoleId}/groups`, {
        group_ids: selectedGroups
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showNotification('Groups updated successfully', 'success');
      await fetchRoles();
      handleCloseGroupModal();
    } catch (error: any) {
      console.error('Error updating groups:', error);
      showNotification(error.response?.data?.error || 'Error updating groups', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading roles...</div>;
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>Role Management</h2>
        <div className="header-actions">
          <RequirePermission action="write" resource="roles">
            <button
              className="btn-primary btn-small"
              onClick={handleCreate}
            >
              Create Role
            </button>
          </RequirePermission>
        </div>
      </div>

      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {/* Desktop Table View */}
      <div className="roles-table-container">
        <table className="roles-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Permissions</th>
              <th>Groups</th>
              {hasAnyRolePermission && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {roles.length === 0 ? (
              <tr>
                <td colSpan={hasAnyRolePermission ? 5 : 4} className="no-users">
                  No roles found. {canWriteRoles ? 'Create your first role to get started.' : ''}
                </td>
              </tr>
            ) : (
              roles.map((role) => (
                <tr key={role.id}>
                  <td data-label="Name">
                    <strong>{role.name}</strong>
                  </td>
                  <td data-label="Description">
                    {role.description || 'No description'}
                  </td>
                  <td data-label="Permissions">
                    <RequirePermission action="read" resource="roles">
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          handleViewPermissions(role);
                        }}
                        style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}
                        title={`${role.permissions ? role.permissions.length : 0} direct permissions`}
                      >
                        {role.permissions ? role.permissions.length : 0} permissions
                      </a>
                    </RequirePermission>
                  </td>
                  <td data-label="Groups">
                    <span className="count-badge">
                      {role.groups ? role.groups.length : 0} group(s)
                    </span>
                  </td>
                  {hasAnyRolePermission && (
                    <td data-label="Actions" className="actions">
                      <div className="action-buttons">
                        <RequirePermission action="write" resource="roles">
                          <button
                            className="btn-icon btn-edit"
                            onClick={() => handleEdit(role)}
                            title="Edit Role"
                          >
                            ✏️
                          </button>
                        </RequirePermission>
                        <RequirePermission action="write" resource="roles">
                          <button
                            className="btn-icon btn-secondary"
                            onClick={() => handleManageGroups(role)}
                            title="Manage Groups"
                          >
                            ⚙️
                          </button>
                        </RequirePermission>
                        <RequirePermission action="write" resource="roles">
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => handleDelete(role)}
                            title="Delete Role"
                          >
                            🗑️
                          </button>
                        </RequirePermission>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="users-cards">
        {roles.length === 0 ? (
          <div className="no-users-card">
            No roles found. {canWriteRoles ? 'Create your first role to get started.' : ''}
          </div>
        ) : (
          roles.map((role) => (
            <RoleCard 
              key={role.id} 
              role={role}
              openEditModal={handleEdit}
              openGroupModal={handleManageGroups}
              openPermissionModal={handleViewPermissions}
              handleDelete={(roleId, roleName) => handleDelete({ id: roleId, name: roleName } as Role)}
              canWriteRoles={canWriteRoles}
            />
          ))
        )}
      </div>

      {/* Role Create/Edit Modal with Wizard */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingRole ? 'Edit Role' : 'Create Role'}
                {!editingRole && ` - Step ${wizardStep} of 2`}
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            {/* Progress indicator for wizard */}
            {!editingRole && (
              <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '14px', fontWeight: wizardStep === 1 ? 'bold' : 'normal' }}>
                    Basic Details
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: wizardStep === 2 ? 'bold' : 'normal' }}>
                    Group Assignment
                  </span>
                </div>
                <div style={{ height: '4px', background: '#e9ecef', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      width: wizardStep === 1 ? '50%' : '100%',
                      transition: 'width 0.3s ease'
                    }} 
                  />
                </div>
              </div>
            )}

            <form className="user-form" onSubmit={handleSubmit} noValidate>
              {/* Step 1: Basic Details */}
              {wizardStep === 1 && (
                <>
                  <div className={`form-group ${fieldErrors.name ? 'has-error' : ''}`}>
                    <label>Role Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={submitting}
                      placeholder="e.g., API Manager"
                      className={fieldErrors.name ? 'input-error' : ''}
                    />
                    {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      disabled={submitting}
                      placeholder="Brief description of the role"
                    />
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleCloseModal}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    {editingRole ? (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Updating...' : 'Update Role'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleNextStep}
                        disabled={submitting}
                      >
                        Next: Group Assignment →
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Group Assignment */}
              {wizardStep === 2 && (
                <>
                  <div className="form-group">
                    <label>Select Groups</label>
                    <select
                      multiple
                      className="roles-select"
                      value={selectedGroups}
                      onChange={handleGroupSelect}
                      disabled={submitting}
                      style={{ minHeight: '150px' }}
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                    <small className="form-help">
                      Hold Ctrl/Cmd to select multiple groups
                    </small>
                  </div>

                  {/* Selected Groups Preview */}
                  {selectedGroups.length > 0 && (
                    <div className="form-group">
                      <label>Selected Groups ({selectedGroups.length})</label>
                      <div style={{ padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                        {selectedGroups.map(groupId => {
                          const group = groups.find(g => g.id === groupId);
                          return (
                            <div key={groupId} style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                              <strong>{group?.name}</strong>
                              {group?.description && <span style={{ color: '#6c757d' }}> - {group.description}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handlePreviousStep}
                      disabled={submitting}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create Role'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Group Management Modal (for existing roles) */}
      {showGroupModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Manage Groups for {roles.find(r => r.id === managingRoleId)?.name}</h3>
              <button className="close-btn" onClick={handleCloseGroupModal}>×</button>
            </div>
            <form className="user-form" onSubmit={handleGroupAssignmentSubmit}>
              <div className="form-group">
                <label>Select Groups</label>
                <select
                  multiple
                  className="roles-select"
                  value={selectedGroups}
                  onChange={handleGroupSelect}
                  disabled={submitting}
                  style={{ minHeight: '150px' }}
                >
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  Hold Ctrl/Cmd to select multiple groups
                </small>
              </div>

              {/* Selected Groups Preview */}
              {selectedGroups.length > 0 && (
                <div className="form-group">
                  <label>Selected Groups ({selectedGroups.length})</label>
                  <div style={{ padding: '0.5rem', border: '1px solid #ced4da', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                    {selectedGroups.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      return (
                        <div key={groupId} style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                          <strong>{group?.name}</strong>
                          {group?.description && <span style={{ color: '#6c757d' }}> - {group.description}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseGroupModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Groups'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Permissions View Modal */}
      {showPermissionModal && viewingRole && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3>Permissions for Role "{viewingRole.name}"</h3>
              <button className="close-btn" onClick={handleClosePermissionModal}>×</button>
            </div>
            
            <div className="user-form">
              {/* Role Permissions Section */}
              <div className="permissions-view-section">
                <h4>Role Permissions ({viewingRole.permissions?.length || 0})</h4>
                {viewingRole.permissions && viewingRole.permissions.length > 0 ? (
                  <div className="permissions-grid">
                    {viewingRole.permissions.map((permission) => (
                      <span key={permission.id} className="permission-badge">
                        {permission.action}:{permission.resource}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="no-permissions">No permissions assigned to this role</p>
                )}
              </div>

              {/* Group Memberships Section */}
              {viewingRole.groups && viewingRole.groups.length > 0 && (
                <div className="permissions-view-section">
                  <h4>Group Memberships ({viewingRole.groups.length})</h4>
                  <div className="groups-list">
                    {viewingRole.groups.map((group) => (
                      <div key={group.id} className="group-membership-card">
                        <div className="group-header">
                          <h5>{group.name}</h5>
                          <span className="group-description">{group.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="info-text">This role is assigned to the groups listed above. Group permissions are managed separately.</p>
                </div>
              )}

              {/* Role Information */}
              <div className="role-info-section">
                <h4>Role Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <strong>Name:</strong> {viewingRole.name}
                  </div>
                  <div className="info-item">
                    <strong>Description:</strong> {viewingRole.description || 'No description'}
                  </div>
                  <div className="info-item">
                    <strong>Created:</strong> {new Date(viewingRole.created_at).toLocaleString()}
                  </div>
                  <div className="info-item">
                    <strong>Last Updated:</strong> {new Date(viewingRole.updated_at).toLocaleString()}
                  </div>
                  <div className="info-item">
                    <strong>Group Memberships:</strong> {viewingRole.groups?.length || 0}
                  </div>
                  <div className="info-item">
                    <strong>Direct Permissions:</strong> {viewingRole.permissions?.length || 0}
                  </div>
                </div>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClosePermissionModal}
                >
                  Close
                </button>
                <RequirePermission action="write" resource="roles">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      handleClosePermissionModal();
                      handleEdit(viewingRole);
                    }}
                  >
                    Edit Role
                  </button>
                </RequirePermission>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
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

export default RoleManagement;