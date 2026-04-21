import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  AlertTitle,
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Skeleton,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import { toaster } from '../components/SCMSToaster';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const EMPTY_NOTICE_FORM = {
  title: '',
  targetRole: 'all',
  body: '',
};

function formatDateLabel(value) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function fetchNotices() {
  const response = await apiClient.get('/notices', {
    params: {
      page: 1,
      limit: 100,
    },
  });

  return response?.data?.data || { items: [], pagination: null };
}

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

function getValidationErrors(error) {
  const payloadErrors = error?.response?.data?.data?.errors;
  if (payloadErrors && typeof payloadErrors === 'object') {
    return payloadErrors;
  }

  return {};
}

function ReadOnlyNoticesView({ user }) {
  const [expandedNoticeIds, setExpandedNoticeIds] = useState(() => new Set());

  const noticesQuery = useQuery({
    queryKey: ['notices', 'read-only', user?.role],
    queryFn: fetchNotices,
    enabled: user?.role === 'student' || user?.role === 'faculty',
  });

  const notices = useMemo(() => {
    const items = noticesQuery.data?.items || [];

    return [...items].sort(
      (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );
  }, [noticesQuery.data?.items]);

  const toggleExpanded = (noticeId) => {
    setExpandedNoticeIds((previous) => {
      const next = new Set(previous);

      if (next.has(noticeId)) {
        next.delete(noticeId);
      } else {
        next.add(noticeId);
      }

      return next;
    });
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Notices
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Latest campus announcements for {user.role === 'faculty' ? 'faculty' : 'students'}.
        </Text>
      </Box>

      {noticesQuery.isPending ? (
        <VStack align="stretch" gap={4}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Box
              key={index}
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <VStack align="stretch" gap={3}>
                <Skeleton height="20px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
              </VStack>
            </Box>
          ))}
        </VStack>
      ) : null}

      {noticesQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load notices</AlertTitle>
            <AlertDescription>
              {getErrorMessage(noticesQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!noticesQuery.isPending && !noticesQuery.isError ? (
        notices.length ? (
          <VStack align="stretch" gap={4}>
            {notices.map((notice) => {
              const expanded = expandedNoticeIds.has(notice.id);

              return (
                <Box
                  key={notice.id}
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  borderRadius="card"
                  boxShadow="card"
                  p={{ base: 4, md: 5 }}
                >
                  <Flex
                    align={{ base: 'start', md: 'center' }}
                    justify="space-between"
                    direction={{ base: 'column', md: 'row' }}
                    gap={2}
                  >
                    <Heading size="md" color="scms.ink">
                      {notice.title}
                    </Heading>

                    <HStack gap={2}>
                      <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                        {formatDateLabel(notice.createdAt)}
                      </Badge>
                      <Badge bg="blue.100" color="blue.800" borderRadius="full" px={2.5} py={1}>
                        {notice.targetRole}
                      </Badge>
                    </HStack>
                  </Flex>

                  <Text mt={3} color="blackAlpha.700" lineClamp={expanded ? 'unset' : 2}>
                    {notice.body}
                  </Text>

                  <Button
                    size="sm"
                    variant="ghost"
                    mt={2}
                    px={0}
                    color="scms.navActive"
                    onClick={() => toggleExpanded(notice.id)}
                  >
                    {expanded ? 'Read less' : 'Read more'}
                  </Button>
                </Box>
              );
            })}
          </VStack>
        ) : (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 6, md: 8 }}
          >
            <Text color="blackAlpha.700">No notices available right now.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function AdminNoticesView() {
  const queryClient = useQueryClient();
  const [expandedNoticeIds, setExpandedNoticeIds] = useState(() => new Set());
  const [formValues, setFormValues] = useState(EMPTY_NOTICE_FORM);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const noticesQuery = useQuery({
    queryKey: ['admin-notices', 'list'],
    queryFn: fetchNotices,
  });

  const notices = useMemo(() => {
    const items = noticesQuery.data?.items || [];

    return [...items].sort(
      (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );
  }, [noticesQuery.data?.items]);

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/notices', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Notice posted',
        description: 'New notice has been published successfully.',
        duration: 3000,
      });
      setFormValues(EMPTY_NOTICE_FORM);
      setEditingNoticeId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to post notice',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ noticeId, payload }) => apiClient.put(`/notices/${noticeId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Notice updated',
        description: 'Notice has been updated successfully.',
        duration: 3000,
      });
      setFormValues(EMPTY_NOTICE_FORM);
      setEditingNoticeId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update notice',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (notice) => apiClient.delete(`/notices/${notice.id}`),
    onMutate: async (notice) => {
      await queryClient.cancelQueries({ queryKey: ['admin-notices', 'list'] });
      const previous = queryClient.getQueryData(['admin-notices', 'list']);

      queryClient.setQueryData(['admin-notices', 'list'], (oldValue) => {
        if (!oldValue?.items) {
          return oldValue;
        }

        return {
          ...oldValue,
          items: oldValue.items.filter((item) => Number(item.id) !== Number(notice.id)),
        };
      });

      return { previous };
    },
    onError: (error, _notice, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-notices', 'list'], context.previous);
      }

      toaster.error({
        title: 'Unable to delete notice',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Notice deleted',
        description: 'Notice has been removed successfully.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notices'] });
      queryClient.invalidateQueries({ queryKey: ['notices'] });
    },
  });

  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  const toggleExpanded = (noticeId) => {
    setExpandedNoticeIds((previous) => {
      const next = new Set(previous);

      if (next.has(noticeId)) {
        next.delete(noticeId);
      } else {
        next.add(noticeId);
      }

      return next;
    });
  };

  const beginEdit = (notice) => {
    setFormErrors({});
    setEditingNoticeId(notice.id);
    setFormValues({
      title: notice.title || '',
      targetRole: notice.targetRole || 'all',
      body: notice.body || '',
    });
  };

  const resetComposer = () => {
    setFormErrors({});
    setEditingNoticeId(null);
    setFormValues(EMPTY_NOTICE_FORM);
  };

  const submitNotice = (event) => {
    event.preventDefault();
    setFormErrors({});

    const payload = {
      title: formValues.title.trim(),
      targetRole: formValues.targetRole,
      body: formValues.body.trim(),
    };

    if (editingNoticeId) {
      updateMutation.mutate({
        noticeId: editingNoticeId,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Notices Management
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Publish announcements and target communication by role.
        </Text>
      </Box>

      <Grid templateColumns={{ base: '1fr', xl: '1.4fr 1fr' }} gap={4} alignItems="start">
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <Flex justify="space-between" align="center" mb={4}>
            <Heading size="md" color="scms.ink">
              Existing Notices
            </Heading>
            <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
              {notices.length} total
            </Badge>
          </Flex>

          {noticesQuery.isPending ? (
            <VStack align="stretch" gap={3}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} height="72px" borderRadius="xl" />
              ))}
            </VStack>
          ) : null}

          {noticesQuery.isError ? (
            <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>Unable to load notices</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(noticesQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </AlertContent>
            </AlertRoot>
          ) : null}

          {!noticesQuery.isPending && !noticesQuery.isError ? (
            notices.length ? (
              <VStack align="stretch" gap={3}>
                {notices.map((notice) => {
                  const expanded = expandedNoticeIds.has(notice.id);

                  return (
                    <Box
                      key={notice.id}
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3.5}
                      py={3.5}
                      bg="blackAlpha.50"
                    >
                      <Flex justify="space-between" align="start" gap={2}>
                        <Box>
                          <Text fontWeight="semibold" color="scms.ink">
                            {notice.title}
                          </Text>
                          <HStack mt={1.5} gap={2} flexWrap="wrap">
                            <Badge bg="white" color="blackAlpha.700" borderRadius="full" px={2.5} py={1}>
                              {formatDateLabel(notice.createdAt)}
                            </Badge>
                            <Badge bg="blue.100" color="blue.800" borderRadius="full" px={2.5} py={1}>
                              {notice.targetRole}
                            </Badge>
                          </HStack>
                        </Box>

                        <HStack gap={1.5}>
                          <IconButton
                            aria-label="Edit notice"
                            size="xs"
                            variant="outline"
                            onClick={() => beginEdit(notice)}
                          >
                            <Icon as={FiEdit2} />
                          </IconButton>
                          <IconButton
                            aria-label="Delete notice"
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(notice)}
                          >
                            <Icon as={FiTrash2} />
                          </IconButton>
                        </HStack>
                      </Flex>

                      <Text mt={2.5} color="blackAlpha.700" lineClamp={expanded ? 'unset' : 2}>
                        {notice.body}
                      </Text>

                      <Button
                        size="xs"
                        variant="ghost"
                        mt={1.5}
                        px={0}
                        color="scms.navActive"
                        onClick={() => toggleExpanded(notice.id)}
                      >
                        {expanded ? 'Read less' : 'Read more'}
                      </Button>
                    </Box>
                  );
                })}
              </VStack>
            ) : (
              <Text color="blackAlpha.700">No notices created yet.</Text>
            )
          ) : null}
        </Box>

        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
          position={{ xl: 'sticky' }}
          top={{ xl: '82px' }}
        >
          <Heading size="md" color="scms.ink" mb={3}>
            {editingNoticeId ? 'Edit Notice' : 'Compose Notice'}
          </Heading>

          <VStack as="form" align="stretch" gap={3} onSubmit={submitNotice}>
            <Box>
              <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                Title
              </Text>
              <Input
                value={formValues.title}
                onChange={(event) => setFormValues((previous) => ({ ...previous, title: event.target.value }))}
                placeholder="Notice title"
                required
              />
              {formErrors.title ? (
                <Text mt={1} fontSize="xs" color="red.600">
                  {formErrors.title}
                </Text>
              ) : null}
            </Box>

            <Box>
              <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                Target Role
              </Text>
              <Box
                as="select"
                value={formValues.targetRole}
                onChange={(event) =>
                  setFormValues((previous) => ({ ...previous, targetRole: event.target.value }))
                }
                w="full"
                borderWidth="1px"
                borderColor="blackAlpha.200"
                borderRadius="md"
                px={3}
                py={2}
                bg="white"
              >
                <option value="all">All</option>
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
              </Box>
              {formErrors.targetRole ? (
                <Text mt={1} fontSize="xs" color="red.600">
                  {formErrors.targetRole}
                </Text>
              ) : null}
            </Box>

            <Box>
              <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                Body
              </Text>
              <Textarea
                value={formValues.body}
                onChange={(event) => setFormValues((previous) => ({ ...previous, body: event.target.value }))}
                placeholder="Write notice content"
                minH="170px"
                required
              />
              {formErrors.body ? (
                <Text mt={1} fontSize="xs" color="red.600">
                  {formErrors.body}
                </Text>
              ) : null}
            </Box>

            <HStack justify="space-between" pt={1}>
              <Button variant="outline" onClick={resetComposer} disabled={isFormSubmitting}>
                Clear
              </Button>
              <Button
                type="submit"
                bg="scms.navActive"
                color="white"
                _hover={{ opacity: 0.92 }}
                disabled={isFormSubmitting}
              >
                {isFormSubmitting
                  ? 'Saving...'
                  : editingNoticeId
                    ? 'Save Notice'
                    : 'Publish Notice'}
              </Button>
            </HStack>
          </VStack>
        </Box>
      </Grid>
    </VStack>
  );
}

function NoticesPage() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminNoticesView />;
  }

  if (user?.role === 'student' || user?.role === 'faculty') {
    return <ReadOnlyNoticesView user={user} />;
  }

  return (
    <PagePlaceholder
      title="Notices"
      description="Notices are available after signing in with a supported role."
    />
  );
}

export default NoticesPage;
