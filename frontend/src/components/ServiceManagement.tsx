import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../provider/authProvider';
import { RequirePermission } from '../contexts/PermissionContext';
import './UserManagement.css';
import './shared.css';
import ConfirmationModal from './ConfirmationModal';

interface Service {
  id: string;
  name: string;
  client_id: string;
  client_secret?: string;
  redirect_uri: string;
  scopes: string;
  is_active: boolean;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ServiceCardProps {
  service: Service;
  openEditModal: (service: Service) => void;
  openDetailsModal: (service: Service) => void;
  handleToggleStatus: (service: Service) => void;
  handleDelete: (serviceId: string, serviceName: string) => void;
  canWriteServices: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  service, 
  openEditModal, 
  openDetailsModal, 
  handleToggleStatus, 
  handleDelete,
  canWriteServices
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="user-card">
      <div className="user-card-header">
        <h3 className="user-card-title">{service.name}</h3>
        <div className="user-card-header-right">
          <span className={`status user-card-status ${service.is_active ? 'active' : 'inactive'}`}>
            {service.is_active ? 'Active' : 'Inactive'}
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
        <span className="preview-email">{service.client_id}</span>
      </div>
      
      {isExpanded && (
        <div className="user-card-body">
          <div className="user-card-field">
            <span className="user-card-label">Redirect URI:</span>
            <span className="user-card-value">{service.redirect_uri}</span>
          </div>
          <div className="user-card-field">
            <span className="user-card-label">Scopes:</span>
            <span className="user-card-value">{service.scopes || 'No scopes'}</span>
          </div>
          
          {canWriteServices && (
            <div className="user-card-actions">
              <div className="primary-actions">
                <button 
                  onClick={() => openEditModal(service)}
                  className="btn-compact btn-edit"
                  title="Edit Service"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleToggleStatus(service)}
                  className={`btn-compact ${service.is_active ? 'btn-deactivate' : 'btn-activate'}`}
                  title={service.is_active ? 'Deactivate Service' : 'Activate Service'}
                >
                  {service.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
              <div className="secondary-actions">
                <button 
                  onClick={() => openDetailsModal(service)}
                  className="btn-compact btn-secondary"
                  title="View Details"
                >
                  Details
                </button>
                <button 
                  onClick={() => handleDelete(service.id, service.name)}
                  className="btn-compact btn-delete"
                  title="Delete Service"
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

const ServiceManagement: React.FC = () => {
  const { token, user } = useAuth();
  const canWriteServices = true; // Simplified for consistency - you may want to implement proper permission check
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [newServiceSecret, setNewServiceSecret] = useState<string | null>(null);
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

  const [formData, setFormData] = useState({
    name: '',
    redirect_uri: '',
    scopes: '',
    is_active: true
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification('Client Secret copied to clipboard', 'success');
    } catch (err) {
      showNotification('Failed to copy to clipboard', 'error');
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get('http://localhost:8080/services', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure we always set an array
      setServices(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Error fetching services:', error);
      showNotification('Error fetching services', 'error');
      setServices([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, [token]);

  const resetForm = () => {
    setFormData({
      name: '',
      redirect_uri: '',
      scopes: '',
      is_active: true
    });
    setEditingService(null);
    setNewServiceSecret(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      redirect_uri: service.redirect_uri,
      scopes: service.scopes,
      is_active: service.is_active
    });
    setNewServiceSecret(null);
    setShowModal(true);
  };

  const handleViewDetails = (service: Service) => {
    setSelectedService(service);
    setShowDetailsModal(true);
  };

  const handleRegenerateSecret = async (service: Service) => {
    setConfirmModal({
      isOpen: true,
      title: 'Regenerate Client Secret',
      message: `Are you sure you want to regenerate the client secret for "${service.name}"? The old secret will no longer work.`,
      type: 'warning',
      onConfirm: async () => {
        try {
          const response = await axios.post(`http://localhost:8080/services/${service.id}/regenerate-secret`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          // Show the new secret in a modal or notification
          setSelectedService(service);
          setNewServiceSecret(response.data.client_secret);
          setShowDetailsModal(true);
          
          showNotification('Client secret regenerated successfully. Please save the new secret!', 'success');
          fetchServices();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error('Error regenerating secret:', error);
          showNotification('Error regenerating client secret', 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleSuspend = async (service: Service) => {
    const action = service.is_active ? 'Suspend' : 'Activate';
    setConfirmModal({
      isOpen: true,
      title: `${action} Service`,
      message: `${action} service "${service.name}"?`,
      type: service.is_active ? 'warning' : 'info',
      onConfirm: async () => {
        try {
          await axios.put(`http://localhost:8080/services/${service.id}`, {
            is_active: !service.is_active
          }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          showNotification(`Service ${service.is_active ? 'suspended' : 'activated'} successfully`, 'success');
          fetchServices();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error('Error updating service:', error);
          showNotification('Error updating service status', 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleDelete = async (service: Service) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Service',
      message: `Are you sure you want to delete service "${service.name}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await axios.delete(`http://localhost:8080/services/${service.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          showNotification('Service deleted successfully', 'success');
          fetchServices();
          setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error: any) {
          console.error('Error deleting service:', error);
          showNotification('Error deleting service', 'error');
          setConfirmModal({ ...confirmModal, isOpen: false });
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingService) {
        // Update existing service
        await axios.put(`http://localhost:8080/services/${editingService.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showNotification('Service updated successfully', 'success');
        setShowModal(false);
        resetForm();
      } else {
        // Create new service
        const response = await axios.post('http://localhost:8080/services', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Show the client secret for the new service
        setNewServiceSecret(response.data.client_secret);
        showNotification('Service created successfully. Please save the client secret!', 'success');
      }

      fetchServices();
    } catch (error: any) {
      console.error('Error saving service:', error);
      const errorMessage = error.response?.data?.error || 'Error saving service';
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

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedService(null);
    setNewServiceSecret(null);
  };

  if (loading) {
    return <div className="loading-message">Loading services...</div>;
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
        <h2>Service Management</h2>
        <div className="header-actions">
          <RequirePermission action="write" resource="services">
            <button
              className="btn-primary btn-small"
              onClick={handleCreate}
            >
              Create Service
            </button>
          </RequirePermission>
        </div>
      </div>


      {/* Desktop Table View */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Client ID</th>
              <th>Redirect URI</th>
              <th>Scopes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {!Array.isArray(services) || services.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-users">No services found</td>
              </tr>
            ) : (
              services.map((service) => (
                <tr key={service.id}>
                  <td>
                    <a 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        handleViewDetails(service);
                      }}
                      style={{ color: '#667eea', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {service.name}
                    </a>
                  </td>
                  <td>
                    <code style={{ fontSize: '12px', background: '#f8f9fa', padding: '2px 4px', borderRadius: '3px' }}>
                      {service.client_id}
                    </code>
                  </td>
                  <td>{service.redirect_uri || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {service.scopes || '-'}
                  </td>
                  <td>
                    <span className={`status ${service.is_active ? 'active' : 'inactive'}`}>
                      {service.is_active ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="actions">
                    <div className="action-buttons">
                      <RequirePermission action="write" resource="services">
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => handleEdit(service)}
                          title="Edit Service"
                        >
                          ✏️
                        </button>
                      </RequirePermission>
                      <RequirePermission action="write" resource="services">
                        <button
                          className="btn-icon btn-secondary"
                          onClick={() => handleRegenerateSecret(service)}
                          title="Regenerate Client Secret"
                        >
                          🔑
                        </button>
                      </RequirePermission>
                      <RequirePermission action="write" resource="services">
                        <button
                          className={`btn-icon ${service.is_active ? 'btn-delete' : 'btn-secondary'}`}
                          onClick={() => handleSuspend(service)}
                          title={service.is_active ? 'Suspend Service' : 'Activate Service'}
                        >
                          {service.is_active ? '⏸️' : '▶️'}
                        </button>
                      </RequirePermission>
                      <RequirePermission action="write" resource="services">
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => handleDelete(service)}
                          title="Delete Service"
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
        {!Array.isArray(services) || services.length === 0 ? (
          <div className="no-users-card">No services found</div>
        ) : (
          services.map((service) => (
            <ServiceCard 
              key={service.id} 
              service={service}
              openEditModal={handleEdit}
              openDetailsModal={handleViewDetails}
              handleToggleStatus={handleSuspend}
              handleDelete={(serviceId, serviceName) => handleDelete({ id: serviceId, name: serviceName } as Service)}
              canWriteServices={canWriteServices}
            />
          ))
        )}
      </div>

      {/* Create/Edit Service Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingService ? 'Edit Service' : 'Create Service'}</h3>
              <button className="close-btn" onClick={handleCloseModal}>×</button>
            </div>
            <form className="user-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={submitting}
                  placeholder="e.g., Document Service"
                />
              </div>

              <div className="form-group">
                <label>Redirect URI</label>
                <input
                  type="text"
                  value={formData.redirect_uri}
                  onChange={(e) => setFormData({ ...formData, redirect_uri: e.target.value })}
                  disabled={submitting}
                  placeholder="https://example.com/callback"
                />
                <small className="form-help">Optional OAuth redirect URI for the service</small>
              </div>

              <div className="form-group">
                <label>Scopes</label>
                <input
                  type="text"
                  value={formData.scopes}
                  onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                  disabled={submitting}
                  placeholder="read:users write:users read:admin"
                />
                <small className="form-help">
                  Space-separated list of permissions in format "action:resource" (e.g., "read:users write:admin")
                </small>
              </div>

              <div className="form-group">
                <label>Status</label>
                <div className="toggle-container">
                  <label htmlFor="is_active" className="toggle-switch">
                    <input
                      id="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      disabled={submitting}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <label htmlFor="is_active">Active Service</label>
                </div>
                <small className="form-help">Inactive services cannot authenticate clients</small>
              </div>

              {/* Show new client secret after creation */}
              {newServiceSecret && (
                <div className="alert alert-success" style={{ 
                  background: '#d4edda', 
                  border: '1px solid #c3e6cb', 
                  color: '#155724', 
                  padding: '12px', 
                  borderRadius: '4px',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>Service Created Successfully!</h4>
                  <p style={{ margin: '0 0 8px 0' }}>
                    <strong>⚠️ Important:</strong> Save this client secret now. It won't be shown again!
                  </p>
                  <div style={{ 
                    background: 'white', 
                    padding: '8px', 
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                    marginBottom: '8px'
                  }}>
                    {newServiceSecret}
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-small"
                    onClick={() => copyToClipboard(newServiceSecret)}
                    style={{ marginRight: '10px' }}
                  >
                    📋 Copy Secret
                  </button>
                  <button
                    type="button"
                    className="btn-primary btn-small"
                    onClick={handleCloseModal}
                  >
                    Done
                  </button>
                </div>
              )}

              {!newServiceSecret && (
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Service Details Modal */}
      {showDetailsModal && selectedService && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Service Details: {selectedService.name}</h3>
              <button className="close-btn" onClick={handleCloseDetailsModal}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div className="detail-row" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Service ID:</label>
                <code style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px', display: 'block' }}>
                  {selectedService.id}
                </code>
              </div>

              <div className="detail-row" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Client ID:</label>
                <code style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px', display: 'block' }}>
                  {selectedService.client_id}
                </code>
              </div>

              {newServiceSecret && (
                <div className="detail-row" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>
                    New Client Secret (save this now!):
                  </label>
                  <div style={{ 
                    background: '#d4edda', 
                    border: '1px solid #c3e6cb',
                    padding: '8px', 
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all'
                  }}>
                    {newServiceSecret}
                  </div>
                  <button
                    className="btn-secondary btn-small"
                    onClick={() => copyToClipboard(newServiceSecret)}
                    style={{ marginTop: '8px' }}
                  >
                    📋 Copy Secret
                  </button>
                </div>
              )}

              <div className="detail-row" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Redirect URI:</label>
                <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                  {selectedService.redirect_uri || 'Not configured'}
                </div>
              </div>

              <div className="detail-row" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Scopes:</label>
                <div style={{ background: '#f8f9fa', padding: '8px', borderRadius: '4px' }}>
                  {selectedService.scopes || 'No scopes defined'}
                </div>
              </div>

              <div className="detail-row" style={{ marginBottom: '16px' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Status:</label>
                <span className={`status ${selectedService.is_active ? 'active' : 'inactive'}`}>
                  {selectedService.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <RequirePermission action="write" resource="services">
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      handleCloseDetailsModal();
                      handleRegenerateSecret(selectedService);
                    }}
                  >
                    🔑 Regenerate Secret
                  </button>
                </RequirePermission>
                <button
                  className="btn-primary"
                  onClick={handleCloseDetailsModal}
                >
                  Close
                </button>
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

export default ServiceManagement;