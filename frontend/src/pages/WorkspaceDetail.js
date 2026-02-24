import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProjectCard from '../components/project/ProjectCard';
import CreateProjectModal from '../components/project/CreateProjectModal';
import * as projectService from '../services/projectService';
import {
  Box,
  Heading,
  Text,
  Button,
  Spinner,
  Center,
  SimpleGrid,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { useAuth } from '../context/AuthContext';
import * as workspaceService from '../services/workspaceService';
import InviteMemberModal from '../components/workspace/InviteMemberModal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useColors from '../hooks/useColors';

const ROLE_STYLES = {
  owner:  { bg: 'yellow.100', color: 'yellow.700', darkBg: '#3b2d00', darkColor: '#fcd34d', label: 'Owner' },
  admin:  { bg: 'blue.100',   color: 'blue.700',   darkBg: '#1e3a5f', darkColor: '#93c5fd', label: 'Admin' },
  member: { bg: 'green.100',  color: 'green.700',  darkBg: '#14532d', darkColor: '#86efac', label: 'Member' },
  viewer: { bg: 'gray.100',   color: 'gray.600',   darkBg: '#1e2535', darkColor: '#94a3b8', label: 'Viewer' },
};

const API_URL = process.env.REACT_APP_API_URL || '';

const MemberAvatar = ({ name, avatar, size = 'md' }) => {
  const initials = name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const sizes = {
    sm: { w: '32px', h: '32px', fontSize: 'xs' },
    md: { w: '48px', h: '48px', fontSize: 'sm' },
  };
  const hasRealAvatar = avatar && !avatar.includes('ui-avatars.com');
  const avatarSrc = hasRealAvatar
    ? avatar.startsWith('/uploads/') ? `${API_URL}${avatar}` : avatar
    : null;
  return (
    <Box
      w={sizes[size].w} h={sizes[size].h}
      borderRadius="full" overflow="hidden"
      display="flex" alignItems="center" justifyContent="center"
      fontWeight="bold" fontSize={sizes[size].fontSize} color="white" flexShrink={0}
      style={avatarSrc ? {} : { background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
    >
      {avatarSrc
        ? <Box as="img" src={avatarSrc} alt={name} w="100%" h="100%" style={{ objectFit: 'cover' }} />
        : initials}
    </Box>
  );
};

const WorkspaceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dark, panelBg, border, textPrimary, textSecondary } = useColors();

  const [workspace, setWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => { fetchWorkspace(); }, [id]);

  const fetchWorkspace = async () => {
    setIsLoading(true);
    try {
      const data = await workspaceService.getWorkspace(id);
      setWorkspace(data.workspace);
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to load workspace', type: 'error', duration: 5000 });
      navigate('/workspaces');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (workspace) fetchProjects(); }, [workspace]);

  const fetchProjects = async () => {
    setProjectsLoading(true);
    try {
      const data = await projectService.getProjects(id);
      setProjects(data.projects);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    try {
      await workspaceService.leaveWorkspace(id);
      toaster.create({ title: 'Success', description: 'You have left the workspace', type: 'success', duration: 3000 });
      navigate('/workspaces');
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to leave workspace', type: 'error', duration: 5000 });
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const data = await projectService.createProject(projectData);
      setProjects([data.project, ...projects]);
      setIsCreateProjectModalOpen(false);
      toaster.create({ title: 'Success', description: 'Project created successfully', type: 'success', duration: 3000 });
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to create project', type: 'error', duration: 5000 });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      await projectService.deleteProject(projectToDelete);
      setProjects(projects.filter((p) => p._id !== projectToDelete));
      toaster.create({ title: 'Success', description: 'Project deleted successfully', type: 'success', duration: 3000 });
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to delete project', type: 'error', duration: 5000 });
    } finally {
      setProjectToDelete(null);
    }
  };

  const handleInviteMember = async (inviteData) => {
    try {
      const data = await workspaceService.inviteMember(id, inviteData);
      toaster.create({ title: 'Success', description: data.message, type: 'success', duration: 3000 });
      fetchWorkspace();
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to invite member', type: 'error', duration: 5000 });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await workspaceService.removeMember(id, memberToRemove);
      toaster.create({ title: 'Success', description: 'Member removed successfully', type: 'success', duration: 3000 });
      fetchWorkspace();
    } catch (error) {
      toaster.create({ title: 'Error', description: error.message || 'Failed to remove member', type: 'error', duration: 5000 });
    } finally {
      setMemberToRemove(null);
    }
  };

  const isOwner = workspace?.owner._id === user?.id;
  const currentUserRole = workspace?.members?.find((m) => m.user._id === user?.id)?.role;
  const canManageMembers = isOwner || currentUserRole === 'admin';

  if (isLoading) {
    return <Center h="100vh"><Spinner size="xl" color="blue.500" /></Center>;
  }
  if (!workspace) return null;

  return (
    <Box py={8} px={8}>
      {/* Back */}
      <Box mb={6}>
        <Button variant="ghost" onClick={() => navigate('/workspaces')} size="sm" color={textSecondary}>
          ← Back to Workspaces
        </Button>
      </Box>

      {/* Workspace Header */}
      <Box bg={panelBg} p={6} borderRadius="lg" boxShadow="md" mb={6}
        border="1px solid" borderColor={border}
        display="flex" justifyContent="space-between" alignItems="start"
      >
        <Box flex={1}>
          <Heading size="2xl" mb={2} color={textPrimary}>{workspace.name}</Heading>
          {workspace.description && (
            <Text color={textSecondary} fontSize="lg">{workspace.description}</Text>
          )}
          <Box mt={4} display="flex" gap={4} alignItems="center">
            <Text fontSize="sm" color={textSecondary}>
              👥 {workspace.members?.length} {workspace.members?.length === 1 ? 'member' : 'members'}
            </Text>
            {isOwner && (
              <Box px={2} py={0.5} bg={dark ? '#3b2d00' : 'yellow.100'} color={dark ? '#fcd34d' : 'yellow.700'}
                borderRadius="md" fontSize="xs" fontWeight="semibold"
              >
                Owner
              </Box>
            )}
          </Box>
        </Box>
        {!isOwner && (
          <Button colorScheme="red" variant="outline" onClick={() => setIsLeaveConfirmOpen(true)}>
            Leave Workspace
          </Button>
        )}
      </Box>

      {/* Members */}
      <Box bg={panelBg} p={6} borderRadius="lg" boxShadow="md" mb={6} border="1px solid" borderColor={border}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg" color={textPrimary}>Team Members</Heading>
          {canManageMembers && (
            <Button colorScheme="blue" onClick={() => setIsInviteModalOpen(true)}>+ Invite Member</Button>
          )}
        </Box>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
          {workspace.members?.map((member) => {
            const rs = ROLE_STYLES[member.role] || ROLE_STYLES.member;
            return (
              <Box key={member._id} p={4} borderRadius="md" border="1px solid" borderColor={border}
                display="flex" alignItems="center" gap={3}
              >
                <MemberAvatar name={member.user.name} avatar={member.user.avatar} size="md" />
                <Box flex={1} overflow="hidden">
                  <Text fontWeight="medium" noOfLines={1} color={textPrimary}>{member.user.name}</Text>
                  <Text fontSize="sm" color={textSecondary} noOfLines={1}>{member.user.email}</Text>
                  <Box display="inline-block" mt={1} px={2} py={0.5}
                    bg={dark ? rs.darkBg : rs.bg} color={dark ? rs.darkColor : rs.color}
                    borderRadius="md" fontSize="xs" fontWeight="semibold"
                  >
                    {rs.label}
                  </Box>
                </Box>
                {canManageMembers && member.role !== 'owner' && member.user._id !== user?.id && (
                  <Button size="sm" colorScheme="red" variant="ghost" flexShrink={0}
                    onClick={() => setMemberToRemove(member.user._id)}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Projects */}
      <Box bg={panelBg} p={6} borderRadius="lg" boxShadow="md" border="1px solid" borderColor={border}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg" color={textPrimary}>Projects</Heading>
          <Button colorScheme="blue" onClick={() => setIsCreateProjectModalOpen(true)}>+ New Project</Button>
        </Box>

        {projectsLoading ? (
          <Center py={10}><Spinner size="lg" color="blue.500" /></Center>
        ) : projects.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="5xl" mb={3}>📊</Text>
            <Heading size="md" mb={2} color={textPrimary}>No projects yet</Heading>
            <Text color={textSecondary} mb={4}>Create your first project to get started</Text>
            <Button colorScheme="blue" onClick={() => setIsCreateProjectModalOpen(true)}>Create Project</Button>
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {projects.map((project) => (
              <ProjectCard
                key={project._id}
                project={project}
                onClick={() => navigate(`/projects/${project._id}`)}
                onDelete={(id) => setProjectToDelete(id)}
                canDelete={isOwner}
              />
            ))}
          </SimpleGrid>
        )}
      </Box>

      {/* Modals */}
      <InviteMemberModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onInvite={handleInviteMember} workspaceId={id} />
      <CreateProjectModal isOpen={isCreateProjectModalOpen} onClose={() => setIsCreateProjectModalOpen(false)} onCreate={handleCreateProject} workspaceId={id} />
      <ConfirmDialog isOpen={isLeaveConfirmOpen} onClose={() => setIsLeaveConfirmOpen(false)} onConfirm={handleLeaveWorkspace} title="Leave Workspace" message="Are you sure you want to leave this workspace? You will lose access to all its projects and tasks." confirmLabel="Leave" colorScheme="red" />
      <ConfirmDialog isOpen={!!memberToRemove} onClose={() => setMemberToRemove(null)} onConfirm={handleRemoveMember} title="Remove Member" message="Are you sure you want to remove this member from the workspace?" confirmLabel="Remove" colorScheme="red" />
      <ConfirmDialog isOpen={!!projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} title="Delete Project" message="Are you sure you want to delete this project? All tasks inside will be permanently lost." confirmLabel="Delete Project" colorScheme="red" />
    </Box>
  );
};

export default WorkspaceDetail;
