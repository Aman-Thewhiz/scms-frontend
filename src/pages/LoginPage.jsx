import { useState } from 'react';
import { Box, Button, Flex, Heading, HStack, Input, Spinner, Text, VStack } from "@chakra-ui/react";
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const roleOptions = [
  { label: 'Student', value: 'student' },
  { label: 'Faculty', value: 'faculty' },
  { label: 'Admin', value: 'admin' },
];

function getValidationErrors(emailValue, passwordValue) {
  const nextErrors = {};
  const trimmedEmail = emailValue.trim();

  if (!trimmedEmail) {
    nextErrors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    nextErrors.email = 'Enter a valid email address.';
  }

  if (!passwordValue) {
    nextErrors.password = 'Password is required.';
  }

  return nextErrors;
}

function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="lg" color="scms.navActive" />
      </Flex>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = getValidationErrors(email, password);

    setFieldErrors(nextErrors);
    setErrorMessage('');

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login(email.trim(), password, role);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const apiFieldErrors = error?.response?.data?.data?.errors;

      if (apiFieldErrors && typeof apiFieldErrors === 'object') {
        setFieldErrors((previous) => ({
          ...previous,
          ...(apiFieldErrors.email ? { email: apiFieldErrors.email } : {}),
          ...(apiFieldErrors.password ? { password: apiFieldErrors.password } : {}),
        }));
      }

      const message =
        error?.response?.data?.message || 'Unable to sign in with the provided credentials.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      px={4}
      py={10}
      bgGradient="linear(to-br, scms.pastelPink 0%, scms.white 48%, scms.pastelGreen 100%)"
    >
      <Box
        as="section"
        w="full"
        maxW="420px"
        bg="white"
        borderWidth="1px"
        borderColor="blackAlpha.100"
        borderRadius="card"
        boxShadow="card"
        p={{ base: 6, md: 8 }}
      >
        <VStack align="start" gap={1}>
          <Text fontSize="xs" fontWeight="bold" letterSpacing="0.18em" color="blackAlpha.600">
            SCMS
          </Text>
          <Heading size="md" color="scms.ink">
            Smart Campus Management
          </Heading>
          <Text color="blackAlpha.700" fontSize="sm">
            Sign in to continue to your dashboard.
          </Text>
        </VStack>

        <HStack mt={6} gap={2} w="full">
          {roleOptions.map((option) => {
            const isSelected = role === option.value;

            return (
              <Button
                key={option.value}
                type="button"
                flex="1"
                size="sm"
                borderRadius="full"
                borderWidth="1px"
                borderColor={isSelected ? 'scms.navActive' : 'blackAlpha.200'}
                bg={isSelected ? 'scms.navActive' : 'white'}
                color={isSelected ? 'white' : 'blackAlpha.800'}
                _hover={{
                  bg: isSelected ? 'scms.navActive' : 'blackAlpha.50',
                }}
                onClick={() => setRole(option.value)}
              >
                {option.label}
              </Button>
            );
          })}
        </HStack>

        <VStack as="form" onSubmit={handleSubmit} mt={6} align="stretch" gap={4}>
          <Box>
            <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
              Email
            </Text>
            <Input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);

                if (fieldErrors.email) {
                  setFieldErrors((previous) => {
                    const nextState = { ...previous };
                    delete nextState.email;
                    return nextState;
                  });
                }
              }}
              placeholder="you@scms.edu"
              bg="white"
              borderColor={fieldErrors.email ? 'red.300' : undefined}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              required
            />

            {fieldErrors.email ? (
              <Text mt={1.5} fontSize="xs" color="red.600">
                {fieldErrors.email}
              </Text>
            ) : null}
          </Box>

          <Box>
            <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
              Password
            </Text>
            <Input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);

                if (fieldErrors.password) {
                  setFieldErrors((previous) => {
                    const nextState = { ...previous };
                    delete nextState.password;
                    return nextState;
                  });
                }
              }}
              placeholder="Enter your password"
              bg="white"
              borderColor={fieldErrors.password ? 'red.300' : undefined}
              aria-invalid={fieldErrors.password ? 'true' : 'false'}
              required
            />

            {fieldErrors.password ? (
              <Text mt={1.5} fontSize="xs" color="red.600">
                {fieldErrors.password}
              </Text>
            ) : null}
          </Box>

          <Button
            type="submit"
            bg="scms.navActive"
            color="white"
            _hover={{ opacity: 0.92 }}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? (
              <HStack gap={2}>
                <Spinner size="sm" />
                <Text>Signing In...</Text>
              </HStack>
            ) : (
              'Sign In'
            )}
          </Button>

          {errorMessage ? (
            <Box
              borderWidth="1px"
              borderColor="red.200"
              bg="red.50"
              color="red.700"
              borderRadius="md"
              px={3}
              py={2.5}
            >
              <Text fontSize="sm">{errorMessage}</Text>
            </Box>
          ) : null}
        </VStack>
      </Box>
    </Flex>
  );
}

export default LoginPage;
