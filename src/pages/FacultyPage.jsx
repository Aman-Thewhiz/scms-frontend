import { useState } from 'react';
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
  DialogBackdrop,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  NativeSelectField,
  NativeSelectIndicator,
  NativeSelectRoot,
  Portal,
  Skeleton,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  Text,
  VStack,
  Heading,
} from '@chakra-ui/react';
import { FiEdit2, FiPlus, FiSearch, FiUserX } from 'react-icons/fi';
import { toaster } from '../components/SCMSToaster';
import { useAuth } from '../contexts/AuthContext';
import PagePlaceholder from '../components/PagePlaceholder';
import apiClient from '../lib/apiClient';

const PAGE_SIZE = 10;

const EMPTY_FACULTY_FORM = {
  name: '',
  email: '',
  departmentId: '',
  isActive: '1',
};

async function fetchDepartments() {
  const response = await apiClient.get('/departments');
  return response?.data?.data || [];
}

async function fetchFacultyList({ page, search, departmentId }) {
  const response = await apiClient.get('/faculty', {
    params: {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      departmentId: departmentId || undefined,
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

function FacultyPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'add',
    faculty: null,
  });
  const [formValues, setFormValues] = useState(EMPTY_FACULTY_FORM);
  const [formErrors, setFormErrors] = useState({});

  if (user?.role !== 'admin') {
    return (
      <PagePlaceholder
        title="Faculty"
        description="Faculty management is available for admins only."
      />
    );
  }

  const listQueryKey = ['admin-faculty', page, appliedSearch, departmentFilter];

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: fetchDepartments,
  });

  const facultyQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      fetchFacultyList({
        page,
        search: appliedSearch,
        departmentId: departmentFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/faculty', payload),
    onSuccess: (response) => {
      const created = response?.data?.data;
      toaster.success({
        title: 'Faculty member created',
        description: created?.initialPassword
          ? `Initial password: ${created.initialPassword}`
          : 'Faculty record has been added.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to create faculty member',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ facultyId, payload }) => apiClient.put(`/faculty/${facultyId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Faculty member updated',
        description: 'Faculty profile has been updated successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update faculty member',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (faculty) => apiClient.delete(`/faculty/${faculty.id}`),
    onMutate: async (faculty) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      const previous = queryClient.getQueryData(listQueryKey);

      queryClient.setQueryData(listQueryKey, (oldValue) => {
        if (!oldValue?.items) {
          return oldValue;
        }

        return {
          ...oldValue,
          items: oldValue.items.map((item) =>
            Number(item.id) === Number(faculty.id)
              ? {
                  ...item,
                  isActive: false,
                }
              : item
          ),
        };
      });

      return { previous };
    },
    onError: (error, _faculty, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryKey, context.previous);
      }

      toaster.error({
        title: 'Unable to deactivate faculty member',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Faculty member deactivated',
        description: 'The faculty account is now inactive.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-faculty'] });
    },
  });

  function openAddDialog() {
    setFormErrors({});
    setFormValues(EMPTY_FACULTY_FORM);
    setDialogState({
      open: true,
      mode: 'add',
      faculty: null,
    });
  }

  function openEditDialog(faculty) {
    setFormErrors({});
    setFormValues({
      name: faculty.name || '',
      email: faculty.email || '',
      departmentId: String(faculty.departmentId || ''),
      isActive: faculty.isActive ? '1' : '0',
    });
    setDialogState({
      open: true,
      mode: 'edit',
      faculty,
    });
  }

  function closeDialog() {
    setFormErrors({});
    setFormValues(EMPTY_FACULTY_FORM);
    setDialogState({
      open: false,
      mode: 'add',
      faculty: null,
    });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setAppliedSearch(searchDraft.trim());
    setPage(1);
  }

  function handleDepartmentFilterChange(event) {
    setDepartmentFilter(event.target.value);
    setPage(1);
  }

  function handleFormFieldChange(field, value) {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (formErrors[field]) {
      setFormErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
  }

  function submitForm(event) {
    event.preventDefault();
    setFormErrors({});

    const payload = {
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      departmentId: Number(formValues.departmentId),
    };

    if (dialogState.mode === 'edit') {
      payload.isActive = formValues.isActive === '1';
      updateMutation.mutate({
        facultyId: dialogState.faculty.id,
        payload,
      });
      return;
    }

    createMutation.mutate(payload);
  }

  const pagination = facultyQuery.data?.pagination;
  const facultyMembers = facultyQuery.data?.items || [];
  const isDialogSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <VStack align="stretch" gap={6}>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        align={{ base: 'start', md: 'center' }}
        justify="space-between"
        gap={3}
      >
        <Box>
          <Heading size="lg" color="scms.ink">
            Faculty Management
          </Heading>
          <Text mt={1} color="blackAlpha.700">
            Manage faculty records, department assignments, and teaching load.
          </Text>
        </Box>

        <Button bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddDialog}>
          <HStack gap={2}>
            <FiPlus />
            <Text>Add Faculty</Text>
          </HStack>
        </Button>
      </Flex>

      <Box
        bg="white"
        borderWidth="1px"
        borderColor="blackAlpha.100"
        borderRadius="card"
        boxShadow="card"
        p={{ base: 4, md: 5 }}
      >
        <Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ base: 'stretch', md: 'end' }}>
          <Box as="form" onSubmit={handleSearchSubmit} flex="1">
            <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
              Search by name or email
            </Text>
            <HStack gap={2} align="stretch">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Type faculty name or email"
              />
              <Button type="submit" variant="outline">
                <HStack gap={1.5}>
                  <FiSearch />
                  <Text>Search</Text>
                </HStack>
              </Button>
            </HStack>
          </Box>

          <Box minW={{ base: 'full', md: '240px' }}>
            <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
              Department
            </Text>
            <NativeSelectRoot>
              <NativeSelectField value={departmentFilter} onChange={handleDepartmentFilterChange}>
                <option value="">All Departments</option>
                {(departmentsQuery.data || []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.deptName}
                  </option>
                ))}
              </NativeSelectField>
              <NativeSelectIndicator />
            </NativeSelectRoot>
          </Box>
        </Flex>
      </Box>

      {facultyQuery.isPending ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <VStack align="stretch" gap={3}>
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} height="16px" borderRadius="md" />
            ))}
          </VStack>
        </Box>
      ) : null}

      {facultyQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load faculty</AlertTitle>
            <AlertDescription>
              {getErrorMessage(facultyQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!facultyQuery.isPending && !facultyQuery.isError ? (
        facultyMembers.length ? (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 4, md: 5 }}
          >
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Faculty ID</TableColumnHeader>
                    <TableColumnHeader>Name</TableColumnHeader>
                    <TableColumnHeader>Email</TableColumnHeader>
                    <TableColumnHeader>Department</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Assigned Courses</TableColumnHeader>
                    <TableColumnHeader>Status</TableColumnHeader>
                    <TableColumnHeader>Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facultyMembers.map((faculty) => (
                    <TableRow key={faculty.id}>
                      <TableCell>
                        <Text fontWeight="medium" color="scms.ink">
                          #{faculty.id}
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Text fontWeight="medium" color="scms.ink">
                          {faculty.name}
                        </Text>
                      </TableCell>
                      <TableCell>{faculty.email}</TableCell>
                      <TableCell>
                        <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                          {faculty.departmentName}
                        </Badge>
                      </TableCell>
                      <TableCell textAlign="right">{Number(faculty.assignedCourseCount || 0)}</TableCell>
                      <TableCell>
                        <Badge
                          bg={faculty.isActive ? 'green.100' : 'red.100'}
                          color={faculty.isActive ? 'green.800' : 'red.800'}
                          borderRadius="full"
                          px={2.5}
                          py={1}
                        >
                          {faculty.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <HStack gap={1.5}>
                          <IconButton
                            aria-label="Edit faculty"
                            size="xs"
                            variant="outline"
                            onClick={() => openEditDialog(faculty)}
                          >
                            <Icon as={FiEdit2} />
                          </IconButton>
                          <IconButton
                            aria-label="Deactivate faculty"
                            size="xs"
                            colorPalette="red"
                            variant="outline"
                            disabled={!faculty.isActive || deactivateMutation.isPending}
                            onClick={() => deactivateMutation.mutate(faculty)}
                          >
                            <Icon as={FiUserX} />
                          </IconButton>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>

            <Flex
              mt={4}
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              gap={2}
            >
              <Text fontSize="sm" color="blackAlpha.700">
                Page {pagination?.page || 1} of {Math.max(pagination?.totalPages || 1, 1)} | Total{' '}
                {pagination?.total || facultyMembers.length} faculty members
              </Text>
              <HStack gap={2}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  disabled={(pagination?.page || 1) <= 1}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(current + 1, Math.max(pagination?.totalPages || 1, 1))
                    )
                  }
                  disabled={(pagination?.page || 1) >= Math.max(pagination?.totalPages || 1, 1)}
                >
                  Next
                </Button>
              </HStack>
            </Flex>
          </Box>
        ) : (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 6, md: 8 }}
          >
            <Text color="blackAlpha.700">No faculty records found for the selected filters.</Text>
          </Box>
        )
      ) : null}

      <DialogRoot
        open={dialogState.open}
        onOpenChange={(details) => {
          if (!details.open) {
            closeDialog();
          }
        }}
      >
        <Portal>
          <DialogBackdrop bg="blackAlpha.400" />
          <DialogPositioner px={3}>
            <DialogContent maxW="lg">
              <DialogHeader>
                <DialogTitle>
                  {dialogState.mode === 'add' ? 'Add Faculty Member' : 'Edit Faculty Member'}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="faculty-form" onSubmit={submitForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Full Name
                    </Text>
                    <Input
                      value={formValues.name}
                      onChange={(event) => handleFormFieldChange('name', event.target.value)}
                      placeholder="Enter full name"
                      required
                    />
                    {formErrors.name ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.name}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Email
                    </Text>
                    <Input
                      type="email"
                      value={formValues.email}
                      onChange={(event) => handleFormFieldChange('email', event.target.value)}
                      placeholder="faculty@campus.edu"
                      required
                    />
                    {formErrors.email ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.email}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Department
                    </Text>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={formValues.departmentId}
                        onChange={(event) => handleFormFieldChange('departmentId', event.target.value)}
                        required
                      >
                        <option value="">Select department</option>
                        {(departmentsQuery.data || []).map((department) => (
                          <option key={department.id} value={department.id}>
                            {department.deptName}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    {formErrors.departmentId ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.departmentId}
                      </Text>
                    ) : null}
                  </Box>

                  {dialogState.mode === 'edit' ? (
                    <Box>
                      <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                        Status
                      </Text>
                      <NativeSelectRoot>
                        <NativeSelectField
                          value={formValues.isActive}
                          onChange={(event) => handleFormFieldChange('isActive', event.target.value)}
                        >
                          <option value="1">Active</option>
                          <option value="0">Inactive</option>
                        </NativeSelectField>
                        <NativeSelectIndicator />
                      </NativeSelectRoot>
                    </Box>
                  ) : null}

                  {formErrors.body ? (
                    <Text fontSize="xs" color="red.600">
                      {formErrors.body}
                    </Text>
                  ) : null}
                </VStack>
              </DialogBody>
              <DialogFooter>
                <HStack gap={2}>
                  <Button variant="outline" onClick={closeDialog} disabled={isDialogSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    bg="scms.navActive"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                    type="submit"
                    form="faculty-form"
                    disabled={isDialogSubmitting}
                  >
                    {isDialogSubmitting
                      ? 'Saving...'
                      : dialogState.mode === 'add'
                        ? 'Create Faculty'
                        : 'Save Changes'}
                  </Button>
                </HStack>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>
    </VStack>
  );
}

export default FacultyPage;
