import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  AlertTitle,
  AvatarFallback,
  AvatarRoot,
  Badge,
  Box,
  Grid,
  Heading,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const AVATAR_SWATCHES = [
  { bg: '#DBEAFE', color: '#1E3A8A' },
  { bg: '#D1FAE5', color: '#065F46' },
  { bg: '#FCE7F3', color: '#9D174D' },
  { bg: '#FEF3C7', color: '#92400E' },
  { bg: '#EDE9FE', color: '#5B21B6' },
];

function getInitials(nameValue) {
  const parts = String(nameValue || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return 'S';
  }

  return parts
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join('');
}

async function fetchMyProfile() {
  const response = await apiClient.get('/auth/me');
  return response?.data?.data || null;
}

function ProfilePage() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['student-profile', 'me'],
    queryFn: fetchMyProfile,
    enabled: user?.role === 'student',
  });

  const avatarSwatch = useMemo(() => {
    const userId = Number(profileQuery.data?.id || user?.id || 0);
    return AVATAR_SWATCHES[Math.abs(userId) % AVATAR_SWATCHES.length];
  }, [profileQuery.data?.id, user?.id]);

  if (user?.role !== 'student') {
    return (
      <PagePlaceholder
        title="Profile"
        description="Role-specific profile experiences for faculty and admin are expanded in later phases."
      />
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          My Profile
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Personal information associated with your student account.
        </Text>
      </Box>

      {profileQuery.isPending ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <VStack align="stretch" gap={3}>
            <Skeleton height="64px" borderRadius="full" w="64px" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        </Box>
      ) : null}

      {profileQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load profile</AlertTitle>
            <AlertDescription>
              {profileQuery.error?.response?.data?.message ||
                profileQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!profileQuery.isPending && !profileQuery.isError && profileQuery.data ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <VStack align="stretch" gap={5}>
            <Box>
              <AvatarRoot
                size="2xl"
                bg={avatarSwatch.bg}
                color={avatarSwatch.color}
                borderWidth="1px"
                borderColor="blackAlpha.100"
              >
                <AvatarFallback>{getInitials(profileQuery.data.name)}</AvatarFallback>
              </AvatarRoot>

              <Heading mt={3} size="md" color="scms.ink">
                {profileQuery.data.name}
              </Heading>
              <Badge mt={2} bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                Student
              </Badge>
            </Box>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }} gap={4}>
              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Student ID
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.rollNumber || profileQuery.data.id}
                </Text>
              </Box>

              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Full Name
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.name}
                </Text>
              </Box>

              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Email
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.email}
                </Text>
              </Box>

              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Phone
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.phone || 'Not provided'}
                </Text>
              </Box>

              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Department
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.departmentName || 'N/A'}
                </Text>
              </Box>

              <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                <Text fontSize="xs" color="blackAlpha.700">
                  Department ID
                </Text>
                <Text mt={1} fontWeight="semibold" color="scms.ink">
                  {profileQuery.data.departmentId || 'N/A'}
                </Text>
              </Box>
            </Grid>
          </VStack>
        </Box>
      ) : null}
    </VStack>
  );
}

export default ProfilePage;
