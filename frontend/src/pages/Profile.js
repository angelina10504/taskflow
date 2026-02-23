import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  Input,
  Textarea,
  Spinner,
} from '@chakra-ui/react';
import { toaster } from '../components/ui/toaster';
import { useAuth } from '../context/AuthContext';
import * as authService from '../services/authService';
import useColors from '../hooks/useColors';

const API_URL = process.env.REACT_APP_API_URL || '';

const Field = ({ label, color, children }) => (
  <Box>
    <Text fontSize="xs" fontWeight="medium" color={color || 'gray.500'} mb={1} textTransform="uppercase" letterSpacing="wider">
      {label}
    </Text>
    {children}
  </Box>
);

const Profile = () => {
  const { user, updateUser } = useAuth();
  const { dark, border, inputBg, textPrimary, textMuted } = useColors();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    jobTitle: user?.jobTitle || '',
    phone: user?.phone || '',
    timezone: user?.timezone || 'UTC',
  });
  const [avatarPreview, setAvatarPreview] = useState(
    user?.avatar
      ? user.avatar.startsWith('/uploads/')
        ? `${API_URL}${user.avatar}`
        : user.avatar
      : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Keep avatarPreview in sync with user.avatar (handles save & async user load)
  useEffect(() => {
    if (!user?.avatar) return;
    setAvatarPreview(
      user.avatar.startsWith('/uploads/')
        ? `${API_URL}${user.avatar}`
        : user.avatar
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.avatar]);

  const initials =
    (form.name || user?.name || 'U')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const inputStyles = {
    borderColor: border,
    bg: inputBg,
    color: textPrimary,
    size: 'sm',
    borderRadius: 'md',
    _focus: { borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' },
  };

  const handleChange = (e) => {
    setSaved(false);
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const data = await authService.updateProfile(form);
      updateUser(data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to save profile',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);

    setIsUploadingAvatar(true);
    try {
      const data = await authService.uploadAvatar(file);
      const newAvatarUrl = data.user.avatar.startsWith('/uploads/')
        ? `${API_URL}${data.user.avatar}`
        : data.user.avatar;
      setAvatarPreview(newAvatarUrl);
      updateUser(data.user);
    } catch (error) {
      setAvatarPreview(
        user?.avatar
          ? user.avatar.startsWith('/uploads/')
            ? `${API_URL}${user.avatar}`
            : user.avatar
          : null
      );
      toaster.create({
        title: 'Error',
        description: error.message || 'Failed to upload avatar',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <Box
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px={4}
    >
      <Box w="100%" maxW="500px" display="flex" flexDirection="column" gap={5}>

        {/* Title */}
        <Heading size="md" textAlign="center" color={textPrimary}>
          My Profile
        </Heading>

        {/* Avatar */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
          <Box
            position="relative"
            w="110px"
            h="110px"
            borderRadius="full"
            overflow="hidden"
            cursor="pointer"
            flexShrink={0}
            onClick={() => !isUploadingAvatar && fileInputRef.current?.click()}
            _hover={{ '& > .overlay': { opacity: 1 } }}
          >
            {avatarPreview ? (
              <Box
                as="img"
                src={avatarPreview}
                alt="avatar"
                w="100%"
                h="100%"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <Box
                w="100%"
                h="100%"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontWeight="bold"
                fontSize="xl"
                color="white"
                style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
              >
                {initials}
              </Box>
            )}
            <Box
              className="overlay"
              position="absolute"
              inset={0}
              bg="blackAlpha.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
              opacity={0}
              transition="opacity 0.15s"
              color="white"
              fontSize="lg"
            >
              {isUploadingAvatar ? <Spinner size="sm" /> : '📷'}
            </Box>
          </Box>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style={{ display: 'none' }}
            onChange={handleAvatarChange}
          />
          <Text fontSize="xs" color={textMuted}>Click to change photo</Text>
        </Box>

        {/* Email */}
        <Field label="Email" color={textMuted}>
          <Input
            value={user?.email || ''}
            isReadOnly
            bg={dark ? '#151d2e' : 'gray.50'}
            color={textMuted}
            borderColor={border}
            size="sm"
            borderRadius="md"
            _focus={{ boxShadow: 'none', borderColor: border }}
          />
        </Field>

        {/* Name + Job Title */}
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
          <Field label="Name" color={textMuted}>
            <Input name="name" value={form.name} onChange={handleChange} placeholder="Your name" {...inputStyles} />
          </Field>
          <Field label="Job Title" color={textMuted}>
            <Input name="jobTitle" value={form.jobTitle} onChange={handleChange} placeholder="e.g. Engineer" {...inputStyles} />
          </Field>
        </Box>

        {/* Phone + Timezone */}
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
          <Field label="Phone" color={textMuted}>
            <Input name="phone" value={form.phone} onChange={handleChange} placeholder="+1 555 000 0000" {...inputStyles} />
          </Field>
          <Field label="Timezone" color={textMuted}>
            <Input name="timezone" value={form.timezone} onChange={handleChange} placeholder="UTC" {...inputStyles} />
          </Field>
        </Box>

        {/* Bio */}
        <Field label="Bio" color={textMuted}>
          <Textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            placeholder="Tell us a little about yourself"
            rows={3}
            size="sm"
            borderRadius="md"
            bg={inputBg}
            color={textPrimary}
            borderColor={border}
            _focus={{ borderColor: 'purple.400', boxShadow: '0 0 0 1px #a855f7' }}
          />
        </Field>

        {/* Save row */}
        <Box display="flex" alignItems="center" gap={3}>
          <Button
            onClick={handleSave}
            loading={isSaving}
            size="sm"
            style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)' }}
            color="white"
            _hover={{ opacity: 0.9 }}
            px={6}
          >
            Save Changes
          </Button>
          <Box
            display="flex"
            alignItems="center"
            gap={1}
            opacity={saved ? 1 : 0}
            transition="opacity 0.3s"
            color="green.600"
            fontSize="sm"
            fontWeight="medium"
          >
            <Text>✓</Text>
            <Text>Changes saved</Text>
          </Box>
        </Box>

      </Box>
    </Box>
  );
};

export default Profile;
