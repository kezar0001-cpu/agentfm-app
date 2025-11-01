import { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import DataState from '../components/DataState';
import ensureArray from '../utils/ensureArray';
import { queryKeys } from '../utils/queryKeys.js';

export default function TeamManagementPage() {
  const queryClient = useQueryClient();
  const [tabValue, setTabValue] = useState(0);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'TECHNICIAN',
    propertyId: '',
    unitId: '',
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: queryKeys.teams.users(),
    queryFn: async () => {
      const roles = ['OWNER', 'TECHNICIAN', 'TENANT'];
      const promises = roles.map(role =>
        apiClient.get(`/users?role=${role}`).then(res => res.data.users || [])
      );
      const results = await Promise.all(promises);
      return results.flat();
    },
  });

  // Fetch pending invites
  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: queryKeys.teams.invites(),
    queryFn: async () => {
      const response = await apiClient.get('/invites');
      return response.data.invites || [];
    },
  });

  // Fetch properties for invite form
  const { data: properties } = useQuery({
    queryKey: queryKeys.properties.selectOptions(),
    queryFn: async () => {
      const response = await apiClient.get('/properties');
      return ensureArray(response.data, ['items', 'data.items', 'properties']);
    },
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/invites', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.invites() });
      toast.success('Invite sent successfully!');
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'TECHNICIAN', propertyId: '', unitId: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send invite');
    },
  });

  // Delete invite mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId) => {
      await apiClient.delete(`/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.invites() });
      toast.success('Invite cancelled');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel invite');
    },
  });

  const handleInviteSubmit = () => {
    if (!inviteForm.email) {
      toast.error('Email is required');
      return;
    }

    const payload = {
      email: inviteForm.email,
      role: inviteForm.role,
    };

    if (inviteForm.propertyId) {
      payload.propertyId = inviteForm.propertyId;
    }

    if (inviteForm.unitId) {
      payload.unitId = inviteForm.unitId;
    }

    createInviteMutation.mutate(payload);
  };

  const getRoleColor = (role) => {
    const colors = {
      OWNER: 'primary',
      TECHNICIAN: 'success',
      TENANT: 'info',
      PROPERTY_MANAGER: 'secondary',
    };
    return colors[role] || 'default';
  };

  const getStatusColor = (status) => {
    const colors = {
      PENDING: 'warning',
      ACCEPTED: 'success',
      EXPIRED: 'error',
    };
    return colors[status] || 'default';
  };

  // Filter users by role for tabs
  const owners = users?.filter(u => u.role === 'OWNER') || [];
  const technicians = users?.filter(u => u.role === 'TECHNICIAN') || [];
  const tenants = users?.filter(u => u.role === 'TENANT') || [];

  const renderUsersTable = (usersList, roleLabel) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {usersList.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography color="text.secondary">
                  No {roleLabel.toLowerCase()} found
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            usersList.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={getRoleColor(user.role)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.isActive ? 'Active' : 'Inactive'} 
                    color={user.isActive ? 'success' : 'default'} 
                    size="small" 
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderInvitesTable = () => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invites?.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                <Typography color="text.secondary">
                  No pending invites
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            invites?.map((invite) => (
              <TableRow key={invite.id}>
                <TableCell>{invite.email}</TableCell>
                <TableCell>
                  <Chip label={invite.role} color={getRoleColor(invite.role)} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={invite.status} color={getStatusColor(invite.status)} size="small" />
                </TableCell>
                <TableCell>
                  {new Date(invite.expiresAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => deleteInviteMutation.mutate(invite.id)}
                    disabled={deleteInviteMutation.isPending}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={600}>
          Team Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: queryKeys.teams.users() });
              queryClient.invalidateQueries({ queryKey: queryKeys.teams.invites() });
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={() => setInviteDialogOpen(true)}
          >
            Invite User
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label={`Owners (${owners.length})`} />
          <Tab label={`Technicians (${technicians.length})`} />
          <Tab label={`Tenants (${tenants.length})`} />
          <Tab label={`Pending Invites (${invites?.length || 0})`} />
        </Tabs>
      </Paper>

      <Paper>
        <DataState data={users} isLoading={usersLoading || invitesLoading}>
          {tabValue === 0 && renderUsersTable(owners, 'Owners')}
          {tabValue === 1 && renderUsersTable(technicians, 'Technicians')}
          {tabValue === 2 && renderUsersTable(tenants, 'Tenants')}
          {tabValue === 3 && renderInvitesTable()}
        </DataState>
      </Paper>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Alert severity="info" icon={<EmailIcon />}>
              An invitation email will be sent to the user with a link to join your team.
            </Alert>

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
            />

            <TextField
              label="Role"
              select
              fullWidth
              required
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <MenuItem value="OWNER">Owner</MenuItem>
              <MenuItem value="TECHNICIAN">Technician</MenuItem>
              <MenuItem value="TENANT">Tenant</MenuItem>
            </TextField>

            <TextField
              label="Property (Optional)"
              select
              fullWidth
              value={inviteForm.propertyId}
              onChange={(e) => setInviteForm({ ...inviteForm, propertyId: e.target.value })}
              helperText="Assign to a specific property"
            >
              <MenuItem value="">None</MenuItem>
              {properties?.map((property) => (
                <MenuItem key={property.id} value={property.id}>
                  {property.name}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInviteSubmit}
            disabled={createInviteMutation.isPending}
            startIcon={createInviteMutation.isPending ? <CircularProgress size={16} /> : <PersonAddIcon />}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
