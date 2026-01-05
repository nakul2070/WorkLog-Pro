import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Plus } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { apiGet, apiPost } from '../../utils/api';

const AddClientDialog = ({ open, onOpenChange, onClientAdded }) => {
  const [clientData, setClientData] = useState({
    name: '',
    type: 'client',
    industry: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const { toast } = useToast();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setClientData({
        name: '',
        type: 'client',
        industry: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: ''
      });
      // Fetch clients for duplicate checking
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      const result = await apiGet('/api/projects/clients/all');
      if (result.success && Array.isArray(result.data)) {
        setClients(result.data);
      } else {
        console.error("Failed to fetch clients:", result);
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const handleAddClient = async () => {
    // Validation
    if (!clientData.name.trim()) {
      toast({ title: "Client name required", variant: "destructive" });
      return;
    }

    // Validate email format if provided
    if (clientData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientData.contactEmail.trim())) {
      toast({ 
        title: "Invalid email", 
        description: "Please enter a valid email address.",
        variant: "destructive" 
      });
      return;
    }

    // Check if client name already exists
    const existingClient = clients.find(
      client => client.name.toLowerCase().trim() === clientData.name.toLowerCase().trim()
    );
    if (existingClient) {
      toast({ 
        title: "Client already exists", 
        description: `A client named "${existingClient.name}" already exists.`,
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await apiPost('/api/projects/clients', { 
        name: clientData.name.trim(), 
        type: clientData.type || 'client',
        industry: clientData.industry.trim() || null,
        contactPerson: clientData.contactPerson.trim() || null,
        contactEmail: clientData.contactEmail.trim() || null,
        contactPhone: clientData.contactPhone.trim() || null,
        address: clientData.address.trim() || null
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to add client.');
      }

      toast({ 
        title: "Client Added", 
        description: `${result.data.name} has been added successfully.`,
        variant: "success"
      });
      
      // Reset form
      setClientData({
        name: '',
        type: 'client',
        industry: '',
        contactPerson: '',
        contactEmail: '',
        contactPhone: '',
        address: ''
      });
      
      // Refresh clients list
      await fetchClients();
      
      // Dispatch event to refresh client lists across the app
      window.dispatchEvent(new CustomEvent('clientAdded', { 
        detail: { client: result.data } 
      }));
      
      // Call callback if provided
      if (onClientAdded) {
        onClientAdded(result.data);
      }
      
      // Close dialog after successful creation
      onOpenChange(false);
    } catch (err) {
      console.error("Add client error:", err);
      toast({ 
        title: "Error", 
        description: `Could not add client: ${err.message}`, 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Add New Client Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Name - Required */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Client Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={clientData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Enter client name"
                className="mt-1"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Type */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Type
              </label>
              <Select
                value={clientData.type}
                onValueChange={(value) => handleFieldChange('type', value)}
                disabled={isSubmitting}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Industry
              </label>
              <Input
                value={clientData.industry}
                onChange={(e) => handleFieldChange('industry', e.target.value)}
                placeholder="Enter industry"
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Person */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Contact Person
              </label>
              <Input
                value={clientData.contactPerson}
                onChange={(e) => handleFieldChange('contactPerson', e.target.value)}
                placeholder="Enter contact person name"
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Contact Email
              </label>
              <Input
                type="email"
                value={clientData.contactEmail}
                onChange={(e) => handleFieldChange('contactEmail', e.target.value)}
                placeholder="Enter email address"
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* Contact Phone */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Contact Phone
              </label>
              <Input
                type="tel"
                value={clientData.contactPhone}
                onChange={(e) => {
                  // Only allow numeric characters and common phone formatting characters (+, -, spaces, parentheses)
                  const value = e.target.value;
                  const numericValue = value.replace(/[^0-9+\-() ]/g, '');
                  handleFieldChange('contactPhone', numericValue);
                }}
                placeholder="Enter phone number"
                className="mt-1"
                disabled={isSubmitting}
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Address
              </label>
              <Textarea
                value={clientData.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Enter address"
                className="mt-1"
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddClient}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting || !clientData.name.trim()}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientDialog;

