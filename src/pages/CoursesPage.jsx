import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
  SimpleGrid,
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
import { NavLink, useSearchParams } from 'react-router-dom';
import { FiArrowRight, FiBookOpen, FiClock, FiEdit2, FiPlus, FiSearch, FiTrash2, FiUsers } from 'react-icons/fi';
import { toaster } from '../components/SCMSToaster';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const EMPTY_COURSE_FORM = {
  courseName: '',
  departmentId: '',
  facultyId: '',
  credits: '3',
  scheduleInfo: '',
};

function getAttendanceBadge(percentage) {
  if (percentage >= 90) {
    return {
      bg: 'green.100',
      color: 'green.800',
      label: 'Excellent',
    };
  }

  if (percentage >= 75) {
    return {
      bg: 'orange.100',
      color: 'orange.800',
      label: 'On Track',
    };
  }

  return {
    bg: 'red.100',
    color: 'red.800',
    label: 'Needs Attention',
  };
}

function toAverageAttendance(students = []) {
  if (!students.length) {
    return 0;
  }

  const total = students.reduce((acc, student) => acc + Number(student.percentage || 0), 0);
  return Number((total / students.length).toFixed(2));
}

async function fetchMyCourses() {
  const response = await apiClient.get('/enrollments/my-courses');
  return response?.data?.data || [];
}

async function fetchFacultyCourses() {
  const response = await apiClient.get('/courses', {
    params: {
      facultyId: 'me',
    },
  });

  return response?.data?.data || [];
}

async function fetchCourseAttendanceSummary(courseId) {
  const response = await apiClient.get(`/attendance/course-summary/${courseId}`);
  return response?.data?.data || { students: [] };
}

async function fetchDepartments() {
  const response = await apiClient.get('/departments');
  return response?.data?.data || [];
}

async function fetchAdminCourses({ search, departmentId }) {
  const response = await apiClient.get('/courses', {
    params: {
      search: search || undefined,
      departmentId: departmentId || undefined,
    },
  });

  return response?.data?.data || [];
}

async function fetchFacultyByDepartment(departmentId) {
  const response = await apiClient.get('/faculty', {
    params: {
      page: 1,
      limit: 100,
      departmentId,
    },
  });

  return response?.data?.data?.items || [];
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

function StudentCoursesView({ user }) {
  const coursesQuery = useQuery({
    queryKey: ['student-courses', 'my-courses'],
    queryFn: fetchMyCourses,
    enabled: user?.role === 'student',
  });

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          My Courses
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Track your enrolled courses and jump to detailed attendance.
        </Text>
      </Box>

      {coursesQuery.isPending ? (
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
                <Skeleton height="20px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
                <Skeleton height="36px" borderRadius="lg" />
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      {coursesQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load courses</AlertTitle>
            <AlertDescription>
              {coursesQuery.error?.response?.data?.message ||
                coursesQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!coursesQuery.isPending && !coursesQuery.isError ? (
        coursesQuery.data.length ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
            {coursesQuery.data.map((enrollment) => {
              const attendancePercentage = Number(
                enrollment.attendanceSummary?.attendancePercentage || 0
              );
              const attendanceBadge = getAttendanceBadge(attendancePercentage);

              return (
                <Box
                  key={enrollment.enrollmentId}
                  bg="white"
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  borderRadius="card"
                  boxShadow="card"
                  p={{ base: 4, md: 5 }}
                >
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Heading size="md" color="scms.ink">
                        {enrollment.course.courseName}
                      </Heading>
                    </Box>

                    <HStack gap={2.5} align="center">
                      <AvatarRoot size="sm" bg="blackAlpha.100" color="scms.ink">
                        <AvatarFallback name={enrollment.course.facultyName} />
                      </AvatarRoot>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium" color="scms.ink">
                          {enrollment.course.facultyName}
                        </Text>
                        <Text fontSize="xs" color="blackAlpha.700">
                          Assigned Faculty
                        </Text>
                      </Box>
                    </HStack>

                    <HStack gap={2} flexWrap="wrap">
                      <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                        {enrollment.course.departmentName}
                      </Badge>
                      <Badge bg="blue.100" color="blue.800" borderRadius="full" px={2.5} py={1}>
                        {enrollment.course.credits} Credits
                      </Badge>
                    </HStack>

                    <Flex
                      align="center"
                      justify="space-between"
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3}
                      py={2.5}
                      bg="blackAlpha.50"
                    >
                      <Box>
                        <Text fontSize="xs" color="blackAlpha.700">
                          Attendance
                        </Text>
                        <Text fontWeight="semibold" color="scms.ink">
                          {attendancePercentage.toFixed(1)}%
                        </Text>
                      </Box>
                      <Badge bg={attendanceBadge.bg} color={attendanceBadge.color} borderRadius="full" px={2.5} py={1}>
                        {attendanceBadge.label}
                      </Badge>
                    </Flex>

                    <VStack align="stretch" gap={1}>
                      {(enrollment.course.scheduleSessions || []).slice(0, 2).map((session) => (
                        <HStack key={session.raw} gap={2} color="blackAlpha.700">
                          <Icon as={FiClock} boxSize={3.5} />
                          <Text fontSize="xs">
                            {session.day} {session.startTime}-{session.endTime}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>

                    <Button
                      as={NavLink}
                      to={`/attendance?courseId=${enrollment.course.id}`}
                      bg="scms.navActive"
                      color="white"
                      _hover={{ opacity: 0.92 }}
                    >
                      <HStack gap={2}>
                        <FiBookOpen />
                        <Text>View Attendance Detail</Text>
                        <FiArrowRight />
                      </HStack>
                    </Button>
                  </VStack>
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
            <Text color="blackAlpha.700">No enrolled courses found yet.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function FacultyCoursesView({ user }) {
  const [searchParams] = useSearchParams();
  const highlightedCourseId = Number(searchParams.get('courseId')) || null;

  const coursesQuery = useQuery({
    queryKey: ['faculty-courses', 'assigned'],
    queryFn: fetchFacultyCourses,
    enabled: user?.role === 'faculty',
  });

  const attendanceSummaryQueries = useQueries({
    queries: (coursesQuery.data || []).map((course) => ({
      queryKey: ['faculty-courses', 'attendance-summary', course.id],
      queryFn: () => fetchCourseAttendanceSummary(course.id),
      enabled: coursesQuery.isSuccess,
    })),
  });

  const attendanceSummaryByCourseId = useMemo(() => {
    const map = new Map();

    (coursesQuery.data || []).forEach((course, index) => {
      const query = attendanceSummaryQueries[index];
      if (query?.data) {
        map.set(course.id, query.data);
      }
    });

    return map;
  }, [attendanceSummaryQueries, coursesQuery.data]);

  const hasSummaryError = attendanceSummaryQueries.some((query) => query.isError);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          My Teaching Courses
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Review enrolled strength, attendance trends, and jump to roster or marking tools.
        </Text>
      </Box>

      {coursesQuery.isPending ? (
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
                <Skeleton height="20px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
                <Skeleton height="16px" borderRadius="md" />
                <Skeleton height="36px" borderRadius="lg" />
                <Skeleton height="36px" borderRadius="lg" />
              </VStack>
            </Box>
          ))}
        </SimpleGrid>
      ) : null}

      {coursesQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load assigned courses</AlertTitle>
            <AlertDescription>
              {coursesQuery.error?.response?.data?.message ||
                coursesQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {hasSummaryError ? (
        <AlertRoot status="warning" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Some attendance summaries are unavailable</AlertTitle>
            <AlertDescription>
              Attendance averages for a few courses could not be loaded. You can still open each course and continue.
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!coursesQuery.isPending && !coursesQuery.isError ? (
        coursesQuery.data.length ? (
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap={4}>
            {coursesQuery.data.map((course, index) => {
              const summaryQuery = attendanceSummaryQueries[index];
              const summaryData = attendanceSummaryByCourseId.get(course.id);
              const averageAttendance = toAverageAttendance(summaryData?.students || []);
              const attendanceBadge = getAttendanceBadge(averageAttendance);
              const isHighlighted = highlightedCourseId === Number(course.id);

              return (
                <Box
                  key={course.id}
                  bg="white"
                  borderWidth="1px"
                  borderColor={isHighlighted ? 'scms.navActive' : 'blackAlpha.100'}
                  borderRadius="card"
                  boxShadow="card"
                  p={{ base: 4, md: 5 }}
                >
                  <VStack align="stretch" gap={4}>
                    <Flex justify="space-between" align="start" gap={2}>
                      <Heading size="md" color="scms.ink">
                        {course.courseName}
                      </Heading>
                      <Icon as={FiBookOpen} boxSize={4.5} color="blackAlpha.700" />
                    </Flex>

                    <HStack gap={2} flexWrap="wrap">
                      <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                        {course.departmentName}
                      </Badge>
                      <Badge bg="blue.100" color="blue.800" borderRadius="full" px={2.5} py={1}>
                        {course.credits} Credits
                      </Badge>
                    </HStack>

                    <Flex
                      align="center"
                      justify="space-between"
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3}
                      py={2.5}
                      bg="blackAlpha.50"
                    >
                      <HStack gap={2} color="blackAlpha.700">
                        <Icon as={FiUsers} boxSize={3.5} />
                        <Text fontSize="sm">Enrolled Students</Text>
                      </HStack>
                      <Text fontWeight="semibold" color="scms.ink">
                        {Number(course.enrollmentCount || 0)}
                      </Text>
                    </Flex>

                    <Flex
                      align="center"
                      justify="space-between"
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3}
                      py={2.5}
                      bg="blackAlpha.50"
                    >
                      <Box>
                        <Text fontSize="xs" color="blackAlpha.700">
                          Average Attendance Rate
                        </Text>
                        {summaryQuery?.isPending ? (
                          <Skeleton height="18px" mt={1} borderRadius="md" />
                        ) : (
                          <Text fontWeight="semibold" color="scms.ink">
                            {averageAttendance.toFixed(1)}%
                          </Text>
                        )}
                      </Box>
                      <Badge bg={attendanceBadge.bg} color={attendanceBadge.color} borderRadius="full" px={2.5} py={1}>
                        {attendanceBadge.label}
                      </Badge>
                    </Flex>

                    <VStack align="stretch" gap={1}>
                      {(course.scheduleSessions || []).slice(0, 2).map((session) => (
                        <HStack key={session.raw} gap={2} color="blackAlpha.700">
                          <Icon as={FiClock} boxSize={3.5} />
                          <Text fontSize="xs">
                            {session.day} {session.startTime}-{session.endTime}
                            {session.location ? ` | ${session.location}` : ''}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>

                    <HStack gap={2} flexWrap="wrap">
                      <Button
                        as={NavLink}
                        to={`/students?courseId=${course.id}`}
                        size="sm"
                        bg="blackAlpha.900"
                        color="white"
                        _hover={{ opacity: 0.9 }}
                      >
                        View Students
                      </Button>

                      <Button
                        as={NavLink}
                        to={`/attendance?courseId=${course.id}`}
                        size="sm"
                        bg="scms.navActive"
                        color="white"
                        _hover={{ opacity: 0.92 }}
                      >
                        Mark Attendance
                      </Button>
                    </HStack>
                  </VStack>
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
            <Text color="blackAlpha.700">No assigned courses found yet.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function AdminCoursesView() {
  const queryClient = useQueryClient();
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'add',
    course: null,
  });
  const [formValues, setFormValues] = useState(EMPTY_COURSE_FORM);
  const [formErrors, setFormErrors] = useState({});

  const coursesQuery = useQuery({
    queryKey: ['admin-courses', appliedSearch, departmentFilter],
    queryFn: () =>
      fetchAdminCourses({
        search: appliedSearch,
        departmentId: departmentFilter,
      }),
  });

  const departmentsQuery = useQuery({
    queryKey: ['departments', 'all'],
    queryFn: fetchDepartments,
  });

  const facultyOptionsQuery = useQuery({
    queryKey: ['admin-courses', 'faculty-options', formValues.departmentId],
    queryFn: () => fetchFacultyByDepartment(formValues.departmentId),
    enabled: Boolean(formValues.departmentId),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/courses', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Course created',
        description: 'Course has been added successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-courses'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to create course',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ courseId, payload }) => apiClient.put(`/courses/${courseId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Course updated',
        description: 'Course details have been updated successfully.',
        duration: 3000,
      });
      closeDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
    onError: (error) => {
      setFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update course',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (course) => apiClient.delete(`/courses/${course.id}`),
    onMutate: async (course) => {
      const queryKey = ['admin-courses', appliedSearch, departmentFilter];
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (oldValue) => {
        if (!Array.isArray(oldValue)) {
          return oldValue;
        }

        return oldValue.filter((item) => Number(item.id) !== Number(course.id));
      });

      return { previous, queryKey };
    },
    onError: (error, _course, context) => {
      if (context?.previous && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }

      toaster.error({
        title: 'Unable to delete course',
        description: getErrorMessage(error, 'Courses with active enrollments cannot be deleted.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Course deleted',
        description: 'Course has been removed successfully.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['faculty-courses'] });
      queryClient.invalidateQueries({ queryKey: ['student-courses'] });
    },
  });

  function openAddDialog() {
    setFormErrors({});
    setFormValues(EMPTY_COURSE_FORM);
    setDialogState({
      open: true,
      mode: 'add',
      course: null,
    });
  }

  function openEditDialog(course) {
    setFormErrors({});
    setFormValues({
      courseName: course.courseName || '',
      departmentId: String(course.departmentId || ''),
      facultyId: String(course.facultyId || ''),
      credits: String(course.credits || ''),
      scheduleInfo: course.scheduleInfo || '',
    });
    setDialogState({
      open: true,
      mode: 'edit',
      course,
    });
  }

  function closeDialog() {
    setFormErrors({});
    setFormValues(EMPTY_COURSE_FORM);
    setDialogState({
      open: false,
      mode: 'add',
      course: null,
    });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    setAppliedSearch(searchDraft.trim());
  }

  function handleFormFieldChange(field, value) {
    setFormValues((previous) => ({
      ...previous,
      [field]: value,
      ...(field === 'departmentId' ? { facultyId: '' } : {}),
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
      courseName: formValues.courseName.trim(),
      departmentId: Number(formValues.departmentId),
      facultyId: Number(formValues.facultyId),
      credits: Number(formValues.credits),
      scheduleInfo: formValues.scheduleInfo.trim(),
    };

    if (dialogState.mode === 'add') {
      createMutation.mutate(payload);
      return;
    }

    updateMutation.mutate({
      courseId: dialogState.course.id,
      payload,
    });
  }

  const courses = coursesQuery.data || [];
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
            Courses Management
          </Heading>
          <Text mt={1} color="blackAlpha.700">
            Manage courses, faculty assignment, and enrollment-ready schedules.
          </Text>
        </Box>

        <Button bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddDialog}>
          <HStack gap={2}>
            <FiPlus />
            <Text>Add Course</Text>
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
              Search courses
            </Text>
            <HStack gap={2} align="stretch">
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by course, department, or faculty"
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
              <NativeSelectField
                value={departmentFilter}
                onChange={(event) => setDepartmentFilter(event.target.value)}
              >
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

      {coursesQuery.isPending ? (
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

      {coursesQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load courses</AlertTitle>
            <AlertDescription>
              {getErrorMessage(coursesQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!coursesQuery.isPending && !coursesQuery.isError ? (
        courses.length ? (
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
                    <TableColumnHeader>Course Name</TableColumnHeader>
                    <TableColumnHeader>Department</TableColumnHeader>
                    <TableColumnHeader>Assigned Faculty</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Enrolled Students</TableColumnHeader>
                    <TableColumnHeader textAlign="right">Credits</TableColumnHeader>
                    <TableColumnHeader>Actions</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell>
                        <VStack align="start" gap={0}>
                          <Text fontWeight="medium" color="scms.ink">
                            {course.courseName}
                          </Text>
                          <Text fontSize="xs" color="blackAlpha.600" lineClamp={1}>
                            {course.scheduleInfo || 'Schedule not set'}
                          </Text>
                        </VStack>
                      </TableCell>
                      <TableCell>{course.departmentName}</TableCell>
                      <TableCell>{course.facultyName}</TableCell>
                      <TableCell textAlign="right">{Number(course.enrollmentCount || 0)}</TableCell>
                      <TableCell textAlign="right">{Number(course.credits || 0)}</TableCell>
                      <TableCell>
                        <HStack gap={1.5}>
                          <IconButton
                            aria-label="Edit course"
                            size="xs"
                            variant="outline"
                            onClick={() => openEditDialog(course)}
                          >
                            <Icon as={FiEdit2} />
                          </IconButton>
                          <IconButton
                            aria-label="Delete course"
                            size="xs"
                            variant="outline"
                            colorPalette="red"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(course)}
                          >
                            <Icon as={FiTrash2} />
                          </IconButton>
                        </HStack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
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
            <Text color="blackAlpha.700">No courses found for the selected filters.</Text>
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
                <DialogTitle>{dialogState.mode === 'add' ? 'Add Course' : 'Edit Course'}</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="course-form" onSubmit={submitForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Course Name
                    </Text>
                    <Input
                      value={formValues.courseName}
                      onChange={(event) => handleFormFieldChange('courseName', event.target.value)}
                      placeholder="e.g. Data Structures"
                      required
                    />
                    {formErrors.courseName ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.courseName}
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

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Faculty
                    </Text>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={formValues.facultyId}
                        onChange={(event) => handleFormFieldChange('facultyId', event.target.value)}
                        required
                        disabled={!formValues.departmentId}
                      >
                        <option value="">
                          {formValues.departmentId ? 'Select faculty member' : 'Select department first'}
                        </option>
                        {(facultyOptionsQuery.data || []).map((faculty) => (
                          <option key={faculty.id} value={faculty.id}>
                            {faculty.name}
                            {faculty.isActive ? '' : ' (inactive)'}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    {formErrors.facultyId ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.facultyId}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Credits
                    </Text>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formValues.credits}
                      onChange={(event) => handleFormFieldChange('credits', event.target.value)}
                      required
                    />
                    {formErrors.credits ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.credits}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Schedule Info
                    </Text>
                    <Input
                      value={formValues.scheduleInfo}
                      onChange={(event) => handleFormFieldChange('scheduleInfo', event.target.value)}
                      placeholder="Mon 09:00-10:00 | Room A-101"
                    />
                    {formErrors.scheduleInfo ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {formErrors.scheduleInfo}
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
                    form="course-form"
                    disabled={isDialogSubmitting}
                  >
                    {isDialogSubmitting
                      ? 'Saving...'
                      : dialogState.mode === 'add'
                        ? 'Create Course'
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

function CoursesPage() {
  const { user } = useAuth();

  if (user?.role === 'student') {
    return <StudentCoursesView user={user} />;
  }

  if (user?.role === 'faculty') {
    return <FacultyCoursesView user={user} />;
  }

  if (user?.role === 'admin') {
    return <AdminCoursesView />;
  }

  return (
    <PagePlaceholder
      title="Courses"
      description="Course management is available for authenticated users only."
    />
  );
}

export default CoursesPage;
