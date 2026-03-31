import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../provider/authProvider';
import { RequirePermission, usePermissions } from '../contexts/PermissionContext';
import './UserManagement.css';
import './shared.css';
import ConfirmationModal from './ConfirmationModal';
import { validateName } from '../utils/validation';

interface Group {
  id: string;
  name: string;
  description: string;
  services?: GroupService[];
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  client_id: string;
  scopes: string;
  is_active: boolean;
}

interface GroupService {
  id: string;
  service_id: string;
  service: Service;
  scopes: string;
}

interface ServiceAssignment {
  service_id: string;
  scopes: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface GroupCardProps {
  group: Group;
  openEditModal: (group: Group) => void;
  openServiceModal: (group: Group) => void;
  handleDelete: (groupId: string, groupName: string) => void;
  canWriteGroups: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  openEditModal, 
  openServiceModal, 
  handleDelete,
  canWriteGroups
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="user-card">
      <div className="user-card-header">
        <h3 className="user-card-title">{group.name}</h3>
        <div className="user-card-header-right">
          <span className={`status user-card-status ${group.services?.length ? 'active' : 'inactive'}`}>
            {group.services?.length || 0} services
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
        <span className="preview-email">{group.description}</span>
      </div>
      
      {isExpanded && (
        <div className="user-card-body">
          <div className="user-card-field">
            <span className="user-card-label">Services:</span>
            <span className="user-card-value">
              {group.services?.length ? 
                group.services.map(gs => gs.service?.name || 'Unknown').join(', ') : 
                'No services assigned'
              }
            </span>
          </div>
          <div className="user-card-field">
            <span className="user-card-label">Created:</span>
            <span className="user-card-value">
              {new Date(group.created_at).toLocaleDateString()}
            </span>
          </div>
          
          {canWriteGroups && (
            <div className="user-card-actions">
              <div className="primary-actions">
                <button 
                  onClick={() => openEditModal(group)}
                  className="btn-compact btn-edit"
                  title="Edit Group"
                >
                  Edit
                </button>
                <button 
                  onClick={() => openServiceModal(group)}
                  className="btn-compact btn-role"
                  title="Manage Services"
                >
                  Services
                </button>
              </div>
              <div className="secondary-actions">
                <button 
                  onClick={() => handleDelete(group.id, group.name)}
                  className="btn-compact btn-delete"
                  title="Delete Group"
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

const GroupManagement: React.FC = () => {
  const { token, user } = useAuth();
  const { permissions: effectivePermissions } = usePermissions();
  const canWriteGroups = effectivePermissions.some(p => p.resource === 'groups' && p.action === 'write');
  const [groups, setGroups] = useState<Group[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [groupPermissions, setGroupPermissions] = useState<any[]>([]);
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
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignment[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Admin permissions are now checked by RequirePermission wrapper components

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
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

  const fetchServices = async () => {
    try {
      const response = await axios.get(API_URL + '/services', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      showNotification('Error fetching services', 'error');
      setServices([]);
    }
  };

  const fetchGroupServices = async (groupId: string) => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const groupServices = Array.isArray(response.data) ? response.data : [];
      const assignments = groupServices.map((gs: GroupService) => ({
        service_id: gs.service_id,
        scopes: gs.scopes || ''
      }));
      setServiceAssignments(assignments);
      setSelectedServices(assignments.map(a => a.service_id));
    } catch (error: any) {
      console.error('Error fetching group services:', error);
      setServiceAssignments([]);
      setSelectedServices([]);
    }
  };

  const fetchGroupPermissions = async (groupId: string) => {
    try {
      const response = await axios.get(`${API_URL}/groups/${groupId}/services`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const groupServices = Array.isArray(response.data) ? response.data : [];
      
      // Transform the data to show service-permission mapping
      const permissions = groupServices.map((gs: GroupService) => ({
        id: gs.id,
        serviceName: gs.service.name,
        serviceId: gs.service_id,
        scopes: gs.scopes,
        permissions: gs.scopes ? gs.scopes.split(' ').filter(s => s.length > 0) : []
      }));
      
      setGroupPermissions(permissions);
    } catch (error: any) {
      console.error('Error fetching group permissions:', error);
      setGroupPermissions([]);
      showNotification('Error fetching group permissions', 'error');
    }
  };

  useEffect(() => {
    if (token) {
      fetchGroups();
      // Only fetch services if user has permission to read services
      if (effectivePermissions?.some(perm => perm.resource === 'services' && perm.action === 'read')) {
        fetchServices();
      }
    }
  }, [token, effectivePermissions]);

  useEffect(() => {
    setLoading(false);
  }, [groups, services]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: ''
    });
    setServiceAssignments([]);
    setSelectedServices([]);
    setEditingGroup(null);
    setWizardStep(1);
    setFieldErrors({});
  };

  const resetServiceForm = () => {
    setServiceAssignments([]);
    setSelectedServices([]);
    setManagingGroupId(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
    setWizardStep(1);
  };

  const handleEdit = (group: Group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description
    });
    setShowModal(true);
    setWizardStep(1);
  };

  const handleManageServices = async (group: Group) => {
    setManagingGroupId(group.id);
    await fetchGroupServices(group.id);
    setShowServiceModal(true);
  };

  const handleViewPermissions = async (group: Group) => {
    setViewingGroup(group);
    await fetchGroupPermissions(group.id);
    setShowPermissionModal(true);
  };

  const handleDelete = async (group: Group) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Group',
      message: `Are you sure you want to delete group "${group.name}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`${API_URL}/groups/${group.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          showNotification('Group deleted successfully', 'success');
          fetchGroups();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error('Error deleting group:', error);
          showNotification('Error deleting group', 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleNextStep = () => {
    if (wizardStep === 1) {
      setFieldErrors({});
      const nameValidation = validateName(formData.name, 'Group name');
      if (!nameValidation.isValid) {
        setFieldErrors({ name: nameValidation.errors.join('; ') });
        return;
      }
      setWizardStep(2);
    }
  };

  const handlePreviousStep = () => {
    if (wizardStep === 2) {
      setWizardStep(1);
    }
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
      const validation = validateName(value, 'Group name');
      if (!validation.isValid) {
        setFieldErrors(prev => ({ ...prev, name: validation.errors.join('; ') }));
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setFieldErrors({});

    const nameValidation = validateName(formData.name, 'Group name');
    if (!nameValidation.isValid) {
      setFieldErrors({ name: nameValidation.errors.join('; ') });
      return;
    }

    if (editingGroup && wizardStep === 1) {
      setSubmitting(true);
      try {
        await axios.put(`${API_URL}/groups/${editingGroup.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Group updated successfully', 'success');
        setShowModal(false);
        resetForm();
        fetchGroups();
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || 'Error updating group';
        const field = error.response?.data?.field;
        if (field) {
          setFieldErrors({ [field]: errorMsg });
        } else {
          showNotification(errorMsg, 'error');
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (wizardStep === 2) {
      setSubmitting(true);
      try {
        const groupResponse = await axios.post(API_URL + '/groups', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const newGroupId = groupResponse.data.id;

        if (serviceAssignments.length > 0) {
          await axios.put(`${API_URL}/groups/${newGroupId}/services`, {
            services: serviceAssignments
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
        }

        showNotification('Group created successfully', 'success');
        setShowModal(false);
        resetForm();
        fetchGroups();
      } catch (error: any) {
        console.error('Error creating group:', error);
        const errorMsg = error.response?.data?.error || 'Error creating group';
        const field = error.response?.data?.field;
        if (field) {
          setFieldErrors({ [field]: errorMsg });
          setWizardStep(1); // Go back to step 1 to show the error
        } else {
          showNotification(errorMsg, 'error');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleServiceAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingGroupId) return;

    setSubmitting(true);

    try {
      await axios.put(`${API_URL}/groups/${managingGroupId}/services`, {
        services: serviceAssignments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification('Services assigned successfully', 'success');
      setShowServiceModal(false);
      resetServiceForm();
      fetchGroups();
    } catch (error: any) {
      console.error('Error assigning services:', error);
      const errorMessage = error.response?.data?.error || 'Error assigning services';
      showNotification(errorMessage, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetForm();
    setSubmitting(false);
  };

  const handleCloseServiceModal = () => {
    setShowServiceModal(false);
    resetServiceForm();
    setSubmitting(false);
  };

  const handleClosePermissionModal = () => {
    setShowPermissionModal(false);
    setViewingGroup(null);
    setGroupPermissions([]);
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => option.value);
    setSelectedServices(selectedOptions);
    
    // Update service assignments
    const newAssignments = selectedOptions.map(serviceId => {
      const existing = serviceAssignments.find(a => a.service_id === serviceId);
      const service = services.find(s => s.id === serviceId);
      return existing || {
        service_id: serviceId,
        scopes: service?.scopes?.split(' ')[0] || '' // Default to first available scope
      };
    });
    setServiceAssignments(newAssignments);
  };


  const getServiceScopes = (serviceId: string): string[] => {
    const service = services.find(s => s.id === serviceId);
    if (!service || !service.scopes) return [];
    return service.scopes.split(' ').filter(s => s.length > 0);
  };


  if (loading) {
    return <div className="loading-message">Loading groups...</div>;
  }

  return (
    <div className="user-management">
      {notification && (
        <div className={`notification-bar notification-${notification.type}`}>
          <span>{notification.message}</span>
          <button 
            className="notification-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      <div className="user-management-header">
        <h2>Group Management</h2>
        <div className="header-actions">
          <RequirePermission action="create" resource="groups">
            <button
              className="btn-primary btn-small"
              onClick={handleCreate}
            >
              Create Group
            </button>
          </RequirePermission>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="groups-table-container">
        <table className="groups-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Description</th>
              <th>Services</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(groups) || groups.length === 0 ? (
              <tr>
                <td colSpan={4} className="no-users">No groups found</td>
              </tr>
            ) : (
              groups.map((group) => (
                <tr key={group.id}>
                  <td>{group.name}</td>
                  <td>{group.description || '-'}</td>
                  <td>
                    {group.services && group.services.length > 0 ? (
                      <RequirePermission action="read" resource="groups">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleViewPermissions(group);
                          }}
                          style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}
                          title="View services and permissions"
                        >
                          {group.services.length} service(s)
                        </a>
                      </RequirePermission>
                    ) : (
                      <span className="no-services">No services</span>
                    )}
                  </td>
                  <td className="actions">
                    <div className="action-buttons">
                      <RequirePermission action="update" resource="groups">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(group)}
                          title="Edit Group"
                        >
                          ✏️
                        </button>
                      </RequirePermission>
                      <RequirePermission action="update" resource="groups">
                        <button
                          className="btn-icon btn-secondary"
                          onClick={() => handleManageServices(group)}
                          title="Manage Services"
                        >
                          ⚙️
                        </button>
                      </RequirePermission>
                      <RequirePermission action="delete" resource="groups">
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(group)}
                          title="Delete Group"
                        >
                          🗑️
                        </button>
                      </RequirePermission>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="users-cards">
        {!Array.isArray(groups) || groups.length === 0 ? (
          <div className="no-users-card">No groups found</div>
        ) : (
          groups.map((group) => (
            <GroupCard 
              key={group.id} 
              group={group}
              openEditModal={handleEdit}
              openServiceModal={handleManageServices}
              handleDelete={(groupId, groupName) => handleDelete({ id: groupId, name: groupName } as Group)}
              canWriteGroups={canWriteGroups}
            />
          ))
        )}
      </div>

      {/* Group Create/Edit Modal with Wizard */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                {editingGroup ? 'Edit Group' : 'Create Group'}
                {!editingGroup && ` - Step ${wizardStep} of 2`}
              </h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            
            {/* Progress indicator for wizard */}
            {!editingGroup && (
              <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '14px', fontWeight: wizardStep === 1 ? 'bold' : 'normal' }}>
                    Basic Details
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: wizardStep === 2 ? 'bold' : 'normal' }}>
                    Service Assignment
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
                    <label>Group Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      disabled={submitting}
                      placeholder="e.g., API Developers"
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
                      placeholder="Brief description of the group"
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
                    {editingGroup ? (
                      <button
                        type="submit"
                        className="btn-primary"
                        disabled={submitting}
                      >
                        {submitting ? 'Updating...' : 'Update Group'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleNextStep}
                        disabled={submitting}
                      >
                        Next: Service Assignment →
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Service Assignment */}
              {wizardStep === 2 && (
                <>
                  <div className="form-group">
                    <label>Select Services</label>
                    <select
                      multiple
                      className="roles-select"
                      value={selectedServices}
                      onChange={handleServiceSelect}
                      disabled={submitting}
                      style={{ minHeight: '150px' }}
                    >
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name} {!service.is_active && '(Inactive)'}
                        </option>
                      ))}
                    </select>
                    <small className="form-help">
                      Hold Ctrl/Cmd to select multiple services
                    </small>
                  </div>

                  {/* Scope Selection for Selected Services */}
                  {selectedServices.length > 0 && (
                    <div className="form-group">
                      <label>Configure Scopes</label>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.5rem' }}>
                        {selectedServices.map(serviceId => {
                          const service = services.find(s => s.id === serviceId);
                          const assignment = serviceAssignments.find(a => a.service_id === serviceId);
                          const availableScopes = getServiceScopes(serviceId);
                          
                          return (
                            <div key={serviceId} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e9ecef' }}>
                              <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                                {service?.name}
                              </div>
                              <div className="scope-selection-container">
                                <label className="scope-selection-label">Select Scopes:</label>
                                <select
                                  multiple
                                  className="roles-select"
                                  value={assignment?.scopes ? assignment.scopes.split(' ').filter(s => s.length > 0) : []}
                                  onChange={(e) => {
                                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                    const newScopes = selectedOptions.join(' ');
                                    setServiceAssignments(prev => 
                                      prev.map(a => a.service_id === serviceId ? { ...a, scopes: newScopes } : a)
                                    );
                                  }}
                                  disabled={submitting}
                                  style={{ minHeight: '100px' }}
                                >
                                  {availableScopes.map(scope => (
                                    <option key={scope} value={scope}>
                                      {scope}
                                    </option>
                                  ))}
                                </select>
                                <small className="scope-selection-help">
                                  Hold Ctrl/Cmd to select multiple scopes. <span className="selected-scopes">Selected: {assignment?.scopes || 'None'}</span>
                                </small>
                              </div>
                              <small style={{ color: '#6c757d', fontSize: '12px' }}>
                                Available: {service?.scopes || 'None'}
                              </small>
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
                      {submitting ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Service Management Modal (for existing groups) */}
      {showServiceModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Manage Services for {groups.find(g => g.id === managingGroupId)?.name}</h3>
              <button className="close-btn" onClick={handleCloseServiceModal}>×</button>
            </div>
            <form className="user-form" onSubmit={handleServiceAssignmentSubmit}>
              <div className="form-group">
                <label>Select Services</label>
                <select
                  multiple
                  className="roles-select"
                  value={selectedServices}
                  onChange={handleServiceSelect}
                  disabled={submitting}
                  style={{ minHeight: '150px' }}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} {!service.is_active && '(Inactive)'}
                    </option>
                  ))}
                </select>
                <small className="form-help">
                  Hold Ctrl/Cmd to select multiple services
                </small>
              </div>

              {/* Scope Configuration */}
              {selectedServices.length > 0 && (
                <div className="form-group">
                  <label>Configure Scopes</label>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ced4da', borderRadius: '4px', padding: '0.5rem' }}>
                    {selectedServices.map(serviceId => {
                      const service = services.find(s => s.id === serviceId);
                      const assignment = serviceAssignments.find(a => a.service_id === serviceId);
                      const availableScopes = getServiceScopes(serviceId);
                      
                      return (
                        <div key={serviceId} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e9ecef' }}>
                          <div style={{ fontWeight: '500', marginBottom: '0.5rem' }}>
                            {service?.name}
                          </div>
                          <div className="scope-selection-container">
                            <label className="scope-selection-label">Select Scopes:</label>
                            <select
                              multiple
                              className="roles-select"
                              value={assignment?.scopes ? assignment.scopes.split(' ').filter(s => s.length > 0) : []}
                              onChange={(e) => {
                                const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                const newScopes = selectedOptions.join(' ');
                                setServiceAssignments(prev => 
                                  prev.map(a => a.service_id === serviceId ? { ...a, scopes: newScopes } : a)
                                );
                              }}
                              disabled={submitting}
                              style={{ minHeight: '100px' }}
                            >
                              {availableScopes.map(scope => (
                                <option key={scope} value={scope}>
                                  {scope}
                                </option>
                              ))}
                            </select>
                            <small className="scope-selection-help">
                              Hold Ctrl/Cmd to select multiple scopes. <span className="selected-scopes">Selected: {assignment?.scopes || 'None'}</span>
                            </small>
                          </div>
                          <small style={{ color: '#6c757d', fontSize: '12px' }}>
                            Available: {service?.scopes || 'None'}
                          </small>
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
                  onClick={handleCloseServiceModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Update Services'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Permission View Modal */}
      {showPermissionModal && viewingGroup && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3>Services & Permissions for "{viewingGroup.name}"</h3>
              <button className="close-btn" onClick={handleClosePermissionModal}>×</button>
            </div>
            
            <div className="user-form">
              {groupPermissions.length === 0 ? (
                <div className="no-services-message">
                  <p>No services assigned to this group.</p>
                </div>
              ) : (
                <div className="services-permissions-container">
                  {groupPermissions.map((servicePermission, index) => (
                    <div key={servicePermission.id} className="service-permission-card">
                      <div className="service-header">
                        <h4>{servicePermission.serviceName}</h4>
                        <span className="service-id">ID: {servicePermission.serviceId}</span>
                      </div>
                      
                      <div className="permissions-section">
                        <h5>Service Permissions:</h5>
                        {servicePermission.permissions.length > 0 ? (
                          <div className="permissions-grid">
                            {servicePermission.permissions.map((permission: string) => (
                              <span key={permission} className="permission-badge">
                                {permission}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-permissions">No permissions assigned</span>
                        )}
                      </div>
                      
                    </div>
                  ))}
                </div>
              )}
              
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleClosePermissionModal}
                >
                  Close
                </button>
                <RequirePermission action="update" resource="groups">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      handleClosePermissionModal();
                      handleManageServices(viewingGroup);
                    }}
                  >
                    Edit Services
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

export default GroupManagement;