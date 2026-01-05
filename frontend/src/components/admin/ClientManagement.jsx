import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Building2, Plus, Loader2, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiDelete } from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';
import AddClientDialog from './AddClientDialog';
import EditClientDialog from './EditClientDialog';

// Truncatable Text Component with Read More/Less
const TruncatableText = ({ text, maxLength = 30, clientId, field }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text || text === '-') {
    return <span>-</span>;
  }
  
  const shouldTruncate = text.length > maxLength;
  
  if (!shouldTruncate) {
    return <span>{text}</span>;
  }
  
  return (
    <div className="space-y-1">
      <div className="text-sm text-black break-words">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="text-xs font-bold text-black-600 hover:text-black-700 hover:underline cursor-pointer"
        type="button"
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
};

const ClientManagement = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [deleteClientOpen, setDeleteClientOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useContext(AuthContext);
  
  // Check if user is admin (only admins can edit/delete)
  const isAdmin = user?.isAdmin || false;

  const fetchClients = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGet('/api/projects/clients/all');
      if (result.success && Array.isArray(result.data)) {
        setClients(result.data);
      } else {
        console.error("Failed to fetch clients:", result);
        throw new Error('Could not load clients.');
      }
    } catch (err) {
      console.error("Error fetching clients:", err);
      setError(err.message || 'Failed to load clients.');
      toast({ 
        title: "Error", 
        description: err.message || 'Failed to load clients.', 
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Listen for client added/updated events to refresh clients
  useEffect(() => {
    const handleClientAdded = () => {
      console.log('🔄 Client added event received in ClientManagement, refreshing...');
      fetchClients();
    };

    const handleClientUpdated = () => {
      console.log('🔄 Client updated event received in ClientManagement, refreshing...');
      fetchClients();
    };

    window.addEventListener('clientAdded', handleClientAdded);
    window.addEventListener('clientUpdated', handleClientUpdated);
    return () => {
      window.removeEventListener('clientAdded', handleClientAdded);
      window.removeEventListener('clientUpdated', handleClientUpdated);
    };
  }, [fetchClients]);

  const handleClientAdded = (newClient) => {
    // Refresh clients list after new client is added
    fetchClients();
  };

  const handleEditClick = (client) => {
    setSelectedClient(client);
    setEditClientOpen(true);
  };

  const handleDeleteClick = (client) => {
    setSelectedClient(client);
    setDeleteClientOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedClient) return;

    setIsDeleting(true);
    try {
      const result = await apiDelete(`/api/projects/clients/${selectedClient.id}`);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete client.');
      }

      toast({ 
        title: "Client Deleted", 
        description: `${selectedClient.name} has been deleted successfully.`,
        variant: "success"
      });
      
      // Refresh clients list
      await fetchClients();
      
      // Dispatch event to refresh client lists across the app
      window.dispatchEvent(new CustomEvent('clientDeleted', { 
        detail: { client: selectedClient } 
      }));
      
      // Close dialog
      setDeleteClientOpen(false);
      setSelectedClient(null);
    } catch (err) {
      console.error("Delete client error:", err);
      toast({ 
        title: "Error", 
        description: `Could not delete client: ${err.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClientUpdated = (updatedClient) => {
    // Refresh clients list after client is updated
    fetchClients();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-slate-600">Loading clients...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium">Failed to load clients</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <Button onClick={fetchClients}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Add Client Button */}
      <div className="flex justify-between items-start">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold text-gray-900">Client Management</h1>
          <p className="text-slate-600">Manage all clients and their information.</p>
        </div>
        <Button
          onClick={() => setAddClientOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-1.5">
            <Building2 className="h-5 w-5" />
            All Clients ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto relative">
            <table className="w-full min-w-[1000px]">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Name</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Type</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Industry</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Contact Person</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Contact Email</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Contact Phone</th>
                  <th className="text-left p-2 text-sm font-semibold text-black bg-slate-50">Address</th>
                  {isAdmin && (
                    <th className="text-center p-2 text-sm font-semibold text-black w-[100px] bg-slate-50">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="p-6 text-center text-black">
                      No clients found. Click "Add Client" to create your first client.
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-2 text-sm text-black font-medium">
                        {client.name}
                        {client.clientCode && (
                          <span className="ml-2 text-xs text-black font-normal">
                            ({client.clientCode})
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-sm text-black capitalize">
                        {client.type || '-'}
                      </td>
                      <td className="p-2 text-sm text-black max-w-[150px]">
                        <TruncatableText text={client.industry} maxLength={30} clientId={client.id} field="industry" />
                      </td>
                      <td className="p-2 text-sm text-black">
                        {client.contactPerson || '-'}
                      </td>
                      <td className="p-2 text-sm text-black">
                        {client.contactEmail ? (
                          <a 
                            href={`mailto:${client.contactEmail}`}
                            className="text-black hover:underline"
                          >
                            {client.contactEmail}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-sm text-black">
                        {client.contactPhone ? (
                          <a 
                            href={`tel:${client.contactPhone}`}
                            className="text-black hover:underline"
                          >
                            {client.contactPhone}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="p-2 text-sm text-black max-w-[200px]">
                        <TruncatableText text={client.address} maxLength={40} clientId={client.id} field="address" />
                      </td>
                      {isAdmin && (
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(client)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              aria-label={`Edit ${client.name}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(client)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Delete ${client.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Client Dialog */}
      <AddClientDialog
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onClientAdded={handleClientAdded}
      />

      {/* Edit Client Dialog */}
      <EditClientDialog
        open={editClientOpen}
        onOpenChange={setEditClientOpen}
        client={selectedClient}
        onClientUpdated={handleClientUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteClientOpen} onOpenChange={setDeleteClientOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedClient?.name}</strong>? 
              This action cannot be undone. If this client is associated with any projects, 
              the deletion will be prevented.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteClientOpen(false);
                setSelectedClient(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientManagement;

