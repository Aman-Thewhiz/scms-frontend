import { useState } from 'react';
import { Box, Button, Heading, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { toaster } from '../components/SCMSToaster';
import apiClient from '../lib/apiClient';

function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [inlineError, setInlineError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setInlineError('');

    if (newPassword !== confirmNewPassword) {
      const mismatchMessage = 'New password and confirm password must match.';
      setInlineError(mismatchMessage);
      toaster.error({
        title: 'Unable to update password',
        description: mismatchMessage,
        duration: 5000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      toaster.success({
        title: 'Password updated',
        description: 'Your password has been changed successfully.',
        duration: 3000,
      });
    } catch (error) {
      const responseErrors = error?.response?.data?.data?.errors;
      const firstFieldError =
        responseErrors && typeof responseErrors === 'object'
          ? Object.values(responseErrors).find((value) => typeof value === 'string')
          : null;

      const message =
        firstFieldError ||
        error?.response?.data?.message ||
        'Unable to change your password right now.';

      setInlineError(message);

      toaster.error({
        title: 'Unable to update password',
        description: message,
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="card"
      boxShadow="card"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="start" gap={5} as="form" onSubmit={handleSubmit} maxW="560px">
        <Box>
          <Heading size="lg" color="scms.ink">
            Settings
          </Heading>
          <Text mt={2} color="blackAlpha.700">
            Keep your account secure by updating your password regularly.
          </Text>
        </Box>

        <Box w="full">
          <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
            Current Password
          </Text>
          <Input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </Box>

        <Box w="full">
          <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
            New Password
          </Text>
          <Input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </Box>

        <Box w="full">
          <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
            Confirm New Password
          </Text>
          <Input
            type="password"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            required
          />
        </Box>

        {inlineError ? (
          <Box
            w="full"
            borderWidth="1px"
            borderColor="red.200"
            bg="red.50"
            color="red.700"
            borderRadius="md"
            px={3}
            py={2.5}
          >
            <Text fontSize="sm">{inlineError}</Text>
          </Box>
        ) : null}

        <Button
          type="submit"
          bg="scms.navActive"
          color="white"
          _hover={{ opacity: 0.92 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? <Spinner size="sm" /> : 'Change Password'}
        </Button>
      </VStack>
    </Box>
  );
}

export default SettingsPage;
