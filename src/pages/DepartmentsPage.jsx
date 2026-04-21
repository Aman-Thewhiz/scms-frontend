import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertContent,
  AlertDescription,
  AlertIndicator,
  AlertRoot,
  AlertTitle,
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
  Grid,
  Heading,
  HStack,
  Icon,
  IconButton,
  Input,
  Portal,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toaster } from '../components/SCMSToaster';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

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

async function fetchDepartments() {
  const response = await apiClient.get('/departments');
  return response?.data?.data || [];
}

async function fetchDepartmentStats() {
  const response = await apiClient.get('/analytics/department-stats');
  return response?.data?.data || [];
}

function DepartmentsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'add',
    department: null,
  });
  const [deptName, setDeptName] = useState('');
  const [formErrors, setFormErrors] = useState({});

  if (user?.role !== 'admin') {
    return (
      <PagePlaceholder
        title="Departments"
        description="Department management is available for admins only."
      />
    );
  }

  const departmentsQuery = useQuery({
    queryKey: ['admin-departments', 'list'],
    queryFn: fetchDepartments,
  });

  const departmentStatsQuery = useQuery({
    queryKey: ['admin-analytics', 'department-stats'],
    queryFn: fetchDepartmentStats,
  });

  const departmentsWithCounts = useMemo(() => {
    const statsByDepartmentId = new Map(
      (departmentStatsQuery.data || []).map((item) => [Number(item.departmentId), item])
    );

    return (departmentsQuery.data || []).map((department) => {
      const stat = statsByDepartmentId.get(Number(department.id));

      return {
        ...department,
        courseCount: Number(stat?.courseCount || 0),
      };
    });
  }, [departmentStatsQuery.data, departmentsQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/departments', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Department created',
        description: 'New department has been added successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics', 'department-stats'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to create department',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ departmentId, payload }) => apiClient.put(`/departments/${departmentId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Department updated',
        description: 'Department details have been updated successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics', 'department-stats'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update department',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (department) => apiClient.delete(`/departments/${department.id}`),
    onMutate: async (department) => {
      await queryClient.cancelQueries({ queryKey: ['admin-departments', 'list'] });
      const previous = queryClient.getQueryData(['admin-departments', 'list']);

      queryClient.setQueryData(['admin-departments', 'list'], (oldValue) => {
        if (!Array.isArray(oldValue)) {
          return oldValue;
        }

        return oldValue.filter((item) => Number(item.id) !== Number(department.id));
      });

      return { previous };
    },
    onError: (error, _department, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-departments', 'list'], context.previous);
      }

      toaster.error({
        title: 'Unable to delete department',
        description: getErrorMessage(error, 'This department may still have linked records.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Department deleted',
        description: 'Department has been removed successfully.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-analytics', 'department-stats'] });
    },
  });

  function openAddDialog() {
    setFormErrors({});
    setDeptName('');
    setDialogState({
      open: true,
      mode: 'add',
      department: null,
    });
  }

  function openEditDialog(department) {
    setFormErrors({});
    setDeptName(department.deptName || '');
    setDialogState({
      open: true,
      mode: 'edit',
      department,
    });
  }

  function closeDialog() {
    setFormErrors({});
    setDeptName('');
    setDialogState({
      open: false,
      mode: 'add',
      department: null,
    });
  }

  function submitForm(event) {
    event.preventDefault();
    setFormErrors({});

    const payload = { deptName: deptName.trim() };

    if (dialogState.mode === 'add') {
      createMutation.mutate(payload);
      return;
    }

    updateMutation.mutate({
      departmentId: dialogState.department.id,
      payload,
    });
  }

  const isLoading = departmentsQuery.isPending;
  const hasError = departmentsQuery.isError;
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
            Departments
          </Heading>
          <Text mt={1} color="blackAlpha.700">
            Organize academic structure and monitor department-level capacity.
          </Text>
        </Box>

        <Button bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddDialog}>
          <HStack gap={2}>
            <FiPlus />
            <Text>Add Department</Text>
          </HStack>
        </Button>
      </Flex>

      {isLoading ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
          {Array.from({ length: 6 }).map((_, index) => (
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
                <Skeleton height="18px" borderRadius="md" />
                <Skeleton height="14px" borderRadius="md" />
                <Skeleton height="14px" borderRadius="md" />
                <Skeleton height="14px" borderRadius="md" />
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      {hasError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load departments</AlertTitle>
            <AlertDescription>
              {getErrorMessage(departmentsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {departmentStatsQuery.isError ? (
        <AlertRoot status="warning" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Course counts unavailable</AlertTitle>
            <AlertDescription>
              Department cards are visible, but course counters could not be loaded right now.
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!isLoading && !hasError ? (
        departmentsWithCounts.length ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
            {departmentsWithCounts.map((department) => {
              const isDeleteBlocked =
                Number(department.studentCount || 0) > 0 || Number(department.facultyCount || 0) > 0;

              return (
                <Box
                  key={department.id}
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  borderRadius="card"
                  boxShadow="card"
                  p={{ base: 4, md: 5 }}
                >
                  <Flex justify="space-between" align="start" gap={3}>
                    <Box>
                      <Heading size="md" color="scms.ink">
                        {department.deptName}
                      </Heading>
                      <Text mt={1} fontSize="sm" color="blackAlpha.700">
                        Department ID #{department.id}
                      </Text>
                    </Box>

                    <HStack gap={1.5}>
                      <IconButton
                        aria-label="Edit department"
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(department)}
                      >
                        <Icon as={FiEdit2} />
                      </IconButton>
                      <IconButton
                        aria-label="Delete department"
                        size="sm"
                        variant="outline"
                        colorPalette="red"
                        disabled={isDeleteBlocked || deleteMutation.isPending}
                        title={
                          isDeleteBlocked
                            ? 'Cannot delete department with existing students or faculty members.'
                            : 'Delete department'
                        }
                        onClick={() => deleteMutation.mutate(department)}
                      >
                        <Icon as={FiTrash2} />
                      </IconButton>
                    </HStack>
                  </Flex>

                  <Grid mt={4} templateColumns="repeat(3, minmax(0, 1fr))" gap={2.5}>
                    <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={2.5} bg="blackAlpha.50">
                      <Text fontSize="xs" color="blackAlpha.700">
                        Students
                      </Text>
                      <Text mt={1} fontWeight="semibold" color="scms.ink">
                        {Number(department.studentCount || 0)}
                      </Text>
                    </Box>

                    <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={2.5} bg="blackAlpha.50">
                      <Text fontSize="xs" color="blackAlpha.700">
                        Faculty
                      </Text>
                      <Text mt={1} fontWeight="semibold" color="scms.ink">
                        {Number(department.facultyCount || 0)}
                      </Text>
                    </Box>

                    <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={2.5} bg="blackAlpha.50">
                      <Text fontSize="xs" color="blackAlpha.700">
                        Courses
                      </Text>
                      <Text mt={1} fontWeight="semibold" color="scms.ink">
                        {Number(department.courseCount || 0)}
                      </Text>
                    </Box>
                  </Grid>
                </Box>
              );
            })}
          </SimpleGrid>
        ) : (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 6, md: 8 }}
          >
            <Text color="blackAlpha.700">No departments found. Add your first department to begin.</Text>
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
            <DialogContent maxW="md">
              <DialogHeader>
                <DialogTitle>
                  {dialogState.mode === 'add' ? 'Add Department' : 'Edit Department'}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="department-form" onSubmit={submitForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Department Name
                    </Text>
                    <Input
                      value={deptName}
                      onChange={(event) => {
                        setDeptName(event.target.value);
                        if (formErrors.deptName) {
                          setFormErrors((previous) => {
                            const next = { ...previous };
                            delete next.deptName;
                            return next;
                          });
                        }
                      }}
                      placeholder="e.g. Computer Science"
                      required
                    />
                    {formErrors.deptName ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.deptName}
                      </Text>
                    ) : null}
                  </Box>

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
                    form="department-form"
                    disabled={isDialogSubmitting}
                  >
                    {isDialogSubmitting
                      ? 'Saving...'
                      : dialogState.mode === 'add'
                        ? 'Create Department'
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

export default DepartmentsPage;
