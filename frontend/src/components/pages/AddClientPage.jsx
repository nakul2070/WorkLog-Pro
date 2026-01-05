import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Building2 } from 'lucide-react';
import AddClientDialog from '../admin/AddClientDialog';

const AddClientPage = () => {
  const navigate = useNavigate();
  const [addClientOpen, setAddClientOpen] = useState(true);

  const handleClientAdded = () => {
    // Navigate back to clients page after adding
    navigate('/admin/clients');
  };

  const handleOpenChange = (open) => {
    setAddClientOpen(open);
    if (!open) {
      navigate('/admin/clients');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-green-600" />
          Add New Client
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AddClientDialog 
          open={addClientOpen} 
          onOpenChange={handleOpenChange}
          onClientAdded={handleClientAdded}
        />
      </CardContent>
    </Card>
  );
};

export default AddClientPage;
