import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Box, Button, Heading, Text, Spinner, Stack } from '@chakra-ui/react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useColors from '../hooks/useColors';

// Redeems a workspace invitation link.
//
// The flow has to work for someone with no account yet, which is the whole
// reason the invite exists — so the page previews the invitation through the
// PUBLIC endpoint first, then asks for a session only when one is needed.
//
//   not signed in  -> show what the invite is for, send to register/login and
//                     come back here afterwards (?next= carries the return path)
//   wrong account  -> say which address was invited; offer to switch
//   signed in, ok  -> accept, then land in the workspace
export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const c = useColors();

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    api
      .get(`/api/workspaces/invitations/${token}`)
      .then((res) => live && setInvite(res.data.invitation))
      .catch((err) =>
        live && setError(err.response?.data?.message || 'This invitation link is not valid.')
      )
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [token]);

  const accept = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await api.post(`/api/workspaces/invitations/${token}/accept`);
      navigate(`/workspaces/${res.data.workspace._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not accept this invitation.');
      setAccepting(false);
    }
  }, [token, navigate]);

  const shell = (children) => (
    <Box minH="100vh" bg={c.pageBg} display="flex" alignItems="center" justifyContent="center" p={4}>
      <Box bg={c.cardBg} borderWidth="1px" borderColor={c.border} borderRadius="xl" p={8} maxW="440px" w="100%">
        {children}
      </Box>
    </Box>
  );

  if (loading) {
    return shell(
      <Stack align="center" gap={3}>
        <Spinner colorPalette="brand" />
        <Text color={c.textSecondary} fontSize="sm">Checking your invitation…</Text>
      </Stack>
    );
  }

  if (error && !invite) {
    return shell(
      <Stack gap={4}>
        <Heading size="md" color={c.textPrimary}>Invitation unavailable</Heading>
        <Text color={c.textSecondary} fontSize="sm">{error}</Text>
        <Button asChild colorPalette="brand"><Link to="/">Back to TaskFlow</Link></Button>
      </Stack>
    );
  }

  // Signed in with the wrong address. The backend refuses this, so the UI says
  // so up front rather than letting the user press a button that cannot work.
  const mismatch =
    isAuthenticated && user?.email && invite &&
    user.email.toLowerCase() !== invite.email.toLowerCase();

  return shell(
    <Stack gap={5}>
      <Stack gap={1}>
        <Text fontSize="xs" letterSpacing="wide" textTransform="uppercase" color={c.textMuted}>
          Workspace invitation
        </Text>
        <Heading size="lg" color={c.textPrimary}>{invite.workspaceName}</Heading>
        <Text color={c.textSecondary} fontSize="sm">
          {invite.invitedBy ? `${invite.invitedBy} invited you` : 'You have been invited'} to join as{' '}
          <Text as="span" fontWeight="semibold" color={c.textPrimary}>{invite.role}</Text>.
        </Text>
      </Stack>

      {error && <Text color="red.500" fontSize="sm">{error}</Text>}

      {!isAuthenticated && (
        <Stack gap={3}>
          <Text color={c.textSecondary} fontSize="sm">
            This invitation was sent to <strong>{invite.email}</strong>. Sign in or create an account
            with that address to accept it.
          </Text>
          <Button asChild colorPalette="brand">
            <Link to={`/register?next=/invite/${token}&email=${encodeURIComponent(invite.email)}`}>
              Create an account
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/login?next=/invite/${token}`}>I already have an account</Link>
          </Button>
        </Stack>
      )}

      {mismatch && (
        <Stack gap={3}>
          <Text color={c.textSecondary} fontSize="sm">
            You're signed in as <strong>{user.email}</strong>, but this invitation was sent to{' '}
            <strong>{invite.email}</strong>.
          </Text>
          <Button asChild variant="outline">
            <Link to={`/login?next=/invite/${token}`}>Sign in as {invite.email}</Link>
          </Button>
        </Stack>
      )}

      {isAuthenticated && !mismatch && (
        <Button colorPalette="brand" onClick={accept} loading={accepting}>
          Accept invitation
        </Button>
      )}

      <Text fontSize="xs" color={c.textMuted}>
        This link expires {new Date(invite.expiresAt).toLocaleDateString()}.
      </Text>
    </Stack>
  );
}
