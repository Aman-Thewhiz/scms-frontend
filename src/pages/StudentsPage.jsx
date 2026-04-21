import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
  Heading,
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
} from '@chakra-ui/react';
import { FiEdit2, FiPlus, FiSearch, FiUserX } from 'react-icons/fi';
import { NavLink, useSearchParams } from 'react-router-dom';
import { toaster } from '../components/SCMSToaster';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const PAGE_SIZE = 10;

const EMPTY_STUDENT_FORM = {
  rollNumber: '',
  name: '',
  email: '',
  phone: '',
  departmentId: '',
  isActive: '1',
};

async function fetchFacultyCourses() {
  const response = await apiClient.get('/courses', {
    params: {
      facultyId: 'me',
    },
  });

  return response?.data?.data || [];
}

async function fetchCourseDetails(courseId) {
  const response = await apiClient.get(`/courses/${courseId}`);
  return response?.data?.data || null;
}

async function fetchCourseAttendanceSummary(courseId) {
  const response = await apiClient.get(`/attendance/course-summary/${courseId}`);
  return response?.data?.data || { students: [] };
}

async function fetchCourseResults(courseId) {
  const response = await apiClient.get(`/results/course/${courseId}`);
  return response?.data?.data || { results: [] };
}

async function fetchDepartments() {
  const response = await apiClient.get('/departments');
  return response?.data?.data || [];
}

async function fetchStudentsList({ page, search, departmentId }) {
  const response = await apiClient.get('/students', {
    params: {
      page,
      limit: PAGE_SIZE,
      search: search || undefined,
      departmentId: departmentId || undefined,
    },
  });

  return response?.data?.data || { items: [], pagination: null };
}

async function fetchStudentDetails(studentId) {
  const response = await apiClient.get(`/students/${studentId}`);
  return response?.data?.data || null;
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

function AdminStudentsView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'add',
    student: null,
  });
  const [formValues, setFormValues] = useState(EMPTY_STUDENT_FORM);
  const [formErrors, setFormErrors] = useState({});

  const listQueryKey = ['admin-students', page, appliedSearch, departmentFilter];

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: fetchDepartments,
  });

  const studentsQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () =>
      fetchStudentsList({
        page,
        search: appliedSearch,
        departmentId: departmentFilter,
      }),
    placeholderData: (previous) => previous,
  });

  const studentDetailQueries = useQueries({
    queries: (studentsQuery.data?.items || []).map((student) => ({
      queryKey: ['admin-students', 'details', student.id],
      queryFn: () => fetchStudentDetails(student.id),
      enabled: studentsQuery.isSuccess,
      staleTime: 2 * 60 * 1000,
    })),
  });

  const detailByStudentId = useMemo(() => {
    const map = new Map();
    (studentsQuery.data?.items || []).forEach((student, index) => {
      const detail = studentDetailQueries[index]?.data;
      if (detail) {
        map.set(Number(student.id), detail);
      }
    });
    return map;
  }, [studentDetailQueries, studentsQuery.data?.items]);

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/students', payload),
    onSuccess: (response) => {
      const created = response?.data?.data;
      toaster.success({
        title: 'Student created',
        description: created?.initialPassword
          ? `Initial password: ${created.initialPassword}`
          : 'Student record has been added.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to create student',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ studentId, payload }) => apiClient.put(`/students/${studentId}`, payload),
    onSuccess: (_, variables) => {
      toaster.success({
        title: 'Student updated',
        description: 'Student profile has been updated successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      queryClient.invalidateQueries({
        queryKey: ['admin-students', 'details', variables.studentId],
      });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update student',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (student) => apiClient.delete(`/students/${student.id}`),
    onMutate: async (student) => {
      await queryClient.cancelQueries({ queryKey: listQueryKey });
      const previous = queryClient.getQueryData(listQueryKey);

      queryClient.setQueryData(listQueryKey, (oldValue) => {
        if (!oldValue?.items) {
          return oldValue;
        }

        return {
          ...oldValue,
          items: oldValue.items.map((item) =>
            Number(item.id) === Number(student.id)
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
    onError: (error, _student, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listQueryKey, context.previous);
      }

      toaster.error({
        title: 'Unable to deactivate student',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Student deactivated',
        description: 'The student account is now inactive.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });

  function openAddDialog() {
    setFormErrors({});
    setFormValues(EMPTY_STUDENT_FORM);
    setDialogState({
      open: true,
      mode: 'add',
      student: null,
    });
  }

  function openEditDialog(student) {
    setFormErrors({});
    setFormValues({
      rollNumber: student.rollNumber || '',
      name: student.name || '',
      email: student.email || '',
      phone: student.phone || '',
      departmentId: String(student.departmentId || ''),
      isActive: student.isActive ? '1' : '0',
    });
    setDialogState({
      open: true,
      mode: 'edit',
      student,
    });
  }

  function closeDialog() {
    setDialogState((previous) => ({ ...previous, open: false }));
    setFormErrors({});
    setFormValues(EMPTY_STUDENT_FORM);
    setDialogState({
      open: false,
      mode: 'add',
      student: null,
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
      rollNumber: formValues.rollNumber.trim(),
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      phone: formValues.phone.trim() || null,
      departmentId: Number(formValues.departmentId),
    };

    if (dialogState.mode === 'edit') {
      payload.isActive = formValues.isActive === '1';
    }

    if (dialogState.mode === 'add') {
      createMutation.mutate(payload);
      return;
    }

    updateMutation.mutate({
      studentId: dialogState.student.id,
      payload,
    });
  }

  const pagination = studentsQuery.data?.pagination;
  const students = studentsQuery.data?.items || [];
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
            Students Management
          </Heading>
          <Text mt={1} color="blackAlpha.700">
            Manage student profiles, enrollment stats, and activation status.
          </Text>
        </Box>

        <Button bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddDialog}>
          <HStack gap={2}>
            <FiPlus />
            <Text>Add Student</Text>
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
                placeholder="Type student name or email"
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

      {studentsQuery.isPending ? (
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

      {studentsQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load students</AlertTitle>
            <AlertDescription>
              {getErrorMessage(studentsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!studentsQuery.isPending && !studentsQuery.isError ? (
        students.length ? (
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
                    <TableColumnHeader>Student ID</TableColumnHeader>
                    <TableColumnHeader>Name</TableColumnHeader>
                    <TableColumnHeader>Email</TableColumnHeader>
                    <TableColumnHeader>Department</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Enrolled Courses</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Attendance %</TableColumnHeader>
                    <TableColumnHeader>Status</TableColumnHeader>
                    <TableColumnHeader>Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const details = detailByStudentId.get(Number(student.id));
                    const attended = details?.attendanceSummary?.attendancePercentage;
                    const enrolledCount = details?.enrolledCourseCount;

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <VStack align="start" gap={0}>
                            <Text fontWeight="medium" color="scms.ink">
                              {student.rollNumber}
                            </Text>
                            <Text fontSize="xs" color="blackAlpha.600">
                              #{student.id}
                            </Text>
                          </VStack>
                        </TableCell>
                        <TableCell>
                          <Text fontWeight="medium" color="scms.ink">
                            {student.name}
                          </Text>
                        </TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>
                          <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                            {student.departmentName}
                          </Badge>
                        </TableCell>
                        <TableCell textAlign="right">
                          {enrolledCount !== undefined ? Number(enrolledCount) : '--'}
                        </TableCell>
                        <TableCell textAlign="right">
                          {attended !== undefined ? `${Number(attended).toFixed(1)}%` : '--'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            bg={student.isActive ? 'green.100' : 'red.100'}
                            color={student.isActive ? 'green.800' : 'red.800'}
                            borderRadius="full"
                            px={2.5}
                            py={1}
                          >
                            {student.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <HStack gap={1.5}>
                            <IconButton
                              aria-label="Edit student"
                              size="xs"
                              variant="outline"
                              onClick={() => openEditDialog(student)}
                            >
                              <Icon as={FiEdit2} />
                            </IconButton>
                            <IconButton
                              aria-label="Deactivate student"
                              size="xs"
                              colorPalette="red"
                              variant="outline"
                              disabled={!student.isActive || deactivateMutation.isPending}
                              onClick={() => deactivateMutation.mutate(student)}
                            >
                              <Icon as={FiUserX} />
                            </IconButton>
                          </HStack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableRoot>
            </TableScrollArea>

            <Flex mt={4} justify="space-between" align={{ base: 'start', md: 'center' }} direction={{ base: 'column', md: 'row' }} gap={2}>
              <Text fontSize="sm" color="blackAlpha.700">
                Page {pagination?.page || 1} of {Math.max(pagination?.totalPages || 1, 1)} | Total{' '}
                {pagination?.total || students.length} students
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
            <Text color="blackAlpha.700">No students found for the selected filters.</Text>
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
                <DialogTitle>{dialogState.mode === 'add' ? 'Add Student' : 'Edit Student'}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="student-form" onSubmit={submitForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Roll Number
                    </Text>
                    <Input
                      value={formValues.rollNumber}
                      onChange={(event) => handleFormFieldChange('rollNumber', event.target.value)}
                      placeholder="e.g. 23CS101"
                      required
                    />
                    {formErrors.rollNumber ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.rollNumber}
                      </Text>
                    ) : null}
                  </Box>

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
                      placeholder="student@campus.edu"
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
                      Phone
                    </Text>
                    <Input
                      value={formValues.phone}
                      onChange={(event) => handleFormFieldChange('phone', event.target.value)}
                      placeholder="Optional"
                    />
                    {formErrors.phone ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.phone}
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
                    form="student-form"
                    disabled={isDialogSubmitting}
                  >
                    {isDialogSubmitting
                      ? 'Saving...'
                      : dialogState.mode === 'add'
                        ? 'Create Student'
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

function pickLatestResultByStudent(results = []) {
  const map = new Map();

  results.forEach((result) => {
    const studentId = Number(result?.student?.id);
    if (!studentId) {
      return;
    }

    const previous = map.get(studentId);

    if (!previous) {
      map.set(studentId, result);
      return;
    }

    const currentTimestamp = new Date(result.updatedAt || result.createdAt || 0).getTime();
    const previousTimestamp = new Date(previous.updatedAt || previous.createdAt || 0).getTime();

    if (currentTimestamp >= previousTimestamp) {
      map.set(studentId, result);
    }
  });

  return map;
}

function formatLatestGrade(result) {
  if (!result) {
    return '--';
  }

  const marks = Number(result.marks || 0).toFixed(1);
  return `${result.grade} (${marks})`;
}

function StudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isAdmin) {
    return <AdminStudentsView />;
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const isFaculty = user?.role === 'faculty';

  const coursesQuery = useQuery({
    queryKey: ['faculty-roster', 'courses'],
    queryFn: fetchFacultyCourses,
    enabled: isFaculty,
  });

  const selectedCourseId = Number(searchParams.get('courseId')) || null;

  useEffect(() => {
    if (!isFaculty) {
      return;
    }

    if (!coursesQuery.isSuccess) {
      return;
    }

    if (selectedCourseId) {
      return;
    }

    if (!coursesQuery.data.length) {
      return;
    }

    setSearchParams({ courseId: String(coursesQuery.data[0].id) }, { replace: true });
  }, [coursesQuery.data, coursesQuery.isSuccess, isFaculty, selectedCourseId, setSearchParams]);

  const courseDetailQuery = useQuery({
    queryKey: ['faculty-roster', 'course-detail', selectedCourseId],
    queryFn: () => fetchCourseDetails(selectedCourseId),
    enabled: isFaculty && Boolean(selectedCourseId),
  });

  const attendanceSummaryQuery = useQuery({
    queryKey: ['faculty-roster', 'attendance-summary', selectedCourseId],
    queryFn: () => fetchCourseAttendanceSummary(selectedCourseId),
    enabled: isFaculty && Boolean(selectedCourseId),
  });

  const resultsQuery = useQuery({
    queryKey: ['faculty-roster', 'results', selectedCourseId],
    queryFn: () => fetchCourseResults(selectedCourseId),
    enabled: isFaculty && Boolean(selectedCourseId),
  });

  const attendanceByStudentId = useMemo(() => {
    const map = new Map();

    (attendanceSummaryQuery.data?.students || []).forEach((student) => {
      map.set(Number(student.id), Number(student.percentage || 0));
    });

    return map;
  }, [attendanceSummaryQuery.data?.students]);

  const latestResultByStudentId = useMemo(
    () => pickLatestResultByStudent(resultsQuery.data?.results || []),
    [resultsQuery.data?.results]
  );

  const rosterRows = useMemo(() => {
    return (courseDetailQuery.data?.enrolledStudents || []).map((student) => ({
      id: Number(student.id),
      name: student.name,
      email: student.email,
      departmentName: student.departmentName,
      attendancePercentage: Number(attendanceByStudentId.get(Number(student.id)) || 0),
      latestResult: latestResultByStudentId.get(Number(student.id)) || null,
    }));
  }, [attendanceByStudentId, courseDetailQuery.data?.enrolledStudents, latestResultByStudentId]);

  const isPageLoading =
    coursesQuery.isPending ||
    (Boolean(selectedCourseId) &&
      (courseDetailQuery.isPending || attendanceSummaryQuery.isPending || resultsQuery.isPending));

  const pageError =
    coursesQuery.error ||
    courseDetailQuery.error ||
    attendanceSummaryQuery.error ||
    resultsQuery.error;

  if (!isFaculty) {
    return (
      <PagePlaceholder
        title="Students"
        description="Admin student management tools are delivered in the admin phase."
      />
    );
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Student Roster
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          View enrolled students, attendance percentage, and latest grade for each course.
        </Text>
      </Box>

      {coursesQuery.isSuccess && coursesQuery.data.length ? (
        <HStack gap={2} flexWrap="wrap">
          {coursesQuery.data.map((course) => {
            const active = Number(course.id) === selectedCourseId;

            return (
              <Button
                key={course.id}
                size="sm"
                borderRadius="full"
                borderWidth="1px"
                borderColor={active ? 'scms.navActive' : 'blackAlpha.200'}
                bg={active ? 'scms.navActive' : 'white'}
                color={active ? 'white' : 'blackAlpha.800'}
                _hover={{
                  bg: active ? 'scms.navActive' : 'blackAlpha.50',
                }}
                onClick={() => setSearchParams({ courseId: String(course.id) })}
              >
                {course.courseName}
              </Button>
            );
          })}
        </HStack>
      ) : null}

      {isPageLoading ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <VStack align="stretch" gap={3}>
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        </Box>
      ) : null}

      {pageError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load student roster</AlertTitle>
            <AlertDescription>
              {pageError?.response?.data?.message ||
                pageError?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!isPageLoading && !pageError ? (
        coursesQuery.data?.length ? (
          selectedCourseId ? (
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'start', md: 'center' }}
                gap={3}
                mb={4}
              >
                <Box>
                  <Heading size="md" color="scms.ink">
                    {courseDetailQuery.data?.courseName || 'Selected Course'}
                  </Heading>
                  <Text mt={1} fontSize="sm" color="blackAlpha.700">
                    {courseDetailQuery.data?.departmentName || '--'} |{' '}
                    {(courseDetailQuery.data?.enrolledStudents || []).length} enrolled students
                  </Text>
                </Box>

                <HStack gap={2} flexWrap="wrap">
                  <Button
                    as={NavLink}
                    to={`/attendance?courseId=${selectedCourseId}`}
                    size="sm"
                    bg="scms.navActive"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                  >
                    Mark Attendance
                  </Button>

                  <Button
                    as={NavLink}
                    to={`/attendance?courseId=${selectedCourseId}&view=summary`}
                    size="sm"
                    variant="outline"
                  >
                    Attendance Summary
                  </Button>
                </HStack>
              </Flex>

              {rosterRows.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Student Name</TableColumnHeader>
                        <TableColumnHeader>Email</TableColumnHeader>
                        <TableColumnHeader>Department</TableColumnHeader>
                        <TableColumnHeader textAlign="right">Attendance %</TableColumnHeader>
                        <TableColumnHeader>Latest Grade</TableColumnHeader>
                        <TableColumnHeader>Actions</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rosterRows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <Text fontWeight="medium" color="scms.ink">
                              {row.name}
                            </Text>
                          </TableCell>
                          <TableCell>{row.email}</TableCell>
                          <TableCell>{row.departmentName}</TableCell>
                          <TableCell textAlign="right">
                            <Badge
                              bg={row.attendancePercentage < 75 ? 'orange.100' : 'green.100'}
                              color={row.attendancePercentage < 75 ? 'orange.800' : 'green.800'}
                              borderRadius="full"
                              px={2.5}
                              py={1}
                            >
                              {row.attendancePercentage.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>{formatLatestGrade(row.latestResult)}</TableCell>
                          <TableCell>
                            <Button
                              as={NavLink}
                              to={`/reports?courseId=${selectedCourseId}&studentId=${row.id}`}
                              size="xs"
                              bg="blackAlpha.900"
                              color="white"
                              _hover={{ opacity: 0.9 }}
                            >
                              Enter Grades
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              ) : (
                <Box
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  borderRadius="xl"
                  px={4}
                  py={6}
                  bg="blackAlpha.50"
                >
                  <Text color="blackAlpha.700">No students are enrolled in this course yet.</Text>
                </Box>
              )}
            </Box>
          ) : null
        ) : (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 6, md: 8 }}
          >
            <Text color="blackAlpha.700">No assigned courses were found for your faculty profile.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

export default StudentsPage;
