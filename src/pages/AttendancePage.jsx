import { useEffect, useMemo, useState } from 'react';
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
  Input,
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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { FiCheck, FiDownload, FiPieChart, FiX } from 'react-icons/fi';
import PagePlaceholder from '../components/PagePlaceholder';
import { toaster } from '../components/SCMSToaster';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DONUT_COLORS = ['#2F9E44', '#F08C00', '#E03131'];
const FACULTY_STATUS_OPTIONS = [
  { key: 'present', label: 'Present', bg: 'green.500', hoverBg: 'green.600' },
  { key: 'late', label: 'Late', bg: 'orange.500', hoverBg: 'orange.600' },
  { key: 'absent', label: 'Absent', bg: 'red.500', hoverBg: 'red.600' },
];

function normalizeStatus(status) {
  if (status === 'present' || status === 'late') {
    return 'present';
  }

  if (status === 'absent') {
    return 'absent';
  }

  return 'none';
}

function toLocalDateOnly(dateValue) {
  const parsed = new Date(dateValue);

  if (Number.isNaN(parsed.getTime())) {
    return String(dateValue).slice(0, 10);
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayDateOnly() {
  return toLocalDateOnly(new Date());
}

function buildAttendanceMonthGrid(last30Days = []) {
  const statusByDate = new Map();

  last30Days.forEach((entry) => {
    if (!entry?.date) {
      return;
    }

    statusByDate.set(toLocalDateOnly(entry.date), normalizeStatus(entry.status));
  });

  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const firstOffset = (firstDay.getDay() + 6) % 7;
  const lastOffset = (lastDay.getDay() + 6) % 7;

  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstOffset);

  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + (6 - lastOffset));

  const rows = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const row = [];

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dateKey = toLocalDateOnly(cursor);
      row.push({
        dateKey,
        dayNumber: cursor.getDate(),
        inCurrentMonth: cursor.getMonth() === month,
        status: statusByDate.get(dateKey) || 'none',
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    rows.push(row);
  }

  return {
    monthLabel: now.toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    }),
    rows,
  };
}

function ErrorAlert({ title, message }) {
  return (
    <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
      <AlertIndicator />
      <AlertContent>
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </AlertContent>
    </AlertRoot>
  );
}

async function fetchStudentAttendanceSummary() {
  const response = await apiClient.get('/attendance/my-summary');
  return response?.data?.data || { courses: [], overall: null };
}

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
  return response?.data?.data || { enrolledStudents: [] };
}

async function fetchAttendanceForDate(courseId, date) {
  const response = await apiClient.get('/attendance', {
    params: {
      courseId,
      startDate: date,
      endDate: date,
      page: 1,
      limit: 500,
    },
  });

  return response?.data?.data || { items: [] };
}

async function fetchCourseAttendanceSummary(courseId) {
  const response = await apiClient.get(`/attendance/course-summary/${courseId}`);
  return response?.data?.data || { students: [] };
}

function StudentAttendanceView({ user }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const attendanceQuery = useQuery({
    queryKey: ['student-attendance', 'my-summary'],
    queryFn: fetchStudentAttendanceSummary,
    enabled: user?.role === 'student',
  });

  const selectedCourseId = Number(searchParams.get('courseId')) || null;
  const availableCourses = attendanceQuery.data?.courses || [];
  const selectedCourse =
    availableCourses.find((item) => Number(item.course.id) === selectedCourseId) ||
    availableCourses[0] ||
    null;

  const selectedCourseSummary = selectedCourse?.summary || {
    totalSessions: 0,
    sessionsPresent: 0,
    sessionsAbsent: 0,
    sessionsLate: 0,
    percentage: 0,
  };

  const chartData = [
    { name: 'Present', value: Number(selectedCourseSummary.sessionsPresent || 0) },
    { name: 'Late', value: Number(selectedCourseSummary.sessionsLate || 0) },
    { name: 'Absent', value: Number(selectedCourseSummary.sessionsAbsent || 0) },
  ];

  const chartTotal = chartData.reduce((acc, item) => acc + item.value, 0);
  const monthGrid = useMemo(
    () => buildAttendanceMonthGrid(selectedCourse?.last30Days || []),
    [selectedCourse?.last30Days]
  );

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Attendance Detail
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          View attendance by course with a monthly calendar and status breakdown.
        </Text>
      </Box>

      {attendanceQuery.isPending ? (
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
            <Skeleton height="220px" borderRadius="xl" />
          </VStack>
        </Box>
      ) : null}

      {attendanceQuery.isError ? (
        <ErrorAlert
          title="Unable to load attendance summary"
          message={
            attendanceQuery.error?.response?.data?.message ||
            attendanceQuery.error?.message ||
            'Please refresh and try again.'
          }
        />
      ) : null}

      {!attendanceQuery.isPending && !attendanceQuery.isError ? (
        availableCourses.length ? (
          <>
            <HStack gap={2} flexWrap="wrap">
              {availableCourses.map((item) => {
                const active = Number(item.course.id) === Number(selectedCourse?.course?.id);

                return (
                  <Button
                    key={item.course.id}
                    size="sm"
                    borderRadius="full"
                    borderWidth="1px"
                    borderColor={active ? 'scms.navActive' : 'blackAlpha.200'}
                    bg={active ? 'scms.navActive' : 'white'}
                    color={active ? 'white' : 'blackAlpha.800'}
                    _hover={{
                      bg: active ? 'scms.navActive' : 'blackAlpha.50',
                    }}
                    onClick={() => setSearchParams({ courseId: String(item.course.id) })}
                  >
                    {item.course.courseName}
                  </Button>
                );
              })}
            </HStack>

            <Box
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
                gap={3}
              >
                <Box>
                  <Heading size="md" color="scms.ink">
                    {selectedCourse?.course?.courseName}
                  </Heading>
                  <Text mt={1} fontSize="sm" color="blackAlpha.700">
                    {selectedCourse?.course?.facultyName} |{' '}
                    {selectedCourse?.course?.scheduleInfo || 'Schedule not set'}
                  </Text>
                </Box>
                <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                  {monthGrid.monthLabel}
                </Badge>
              </Flex>

              <Grid
                mt={5}
                templateColumns={{ base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' }}
                gap={3}
              >
                <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3} bg="blackAlpha.50">
                  <Text fontSize="xs" color="blackAlpha.700">
                    Sessions Present
                  </Text>
                  <Heading size="md" mt={1} color="scms.ink">
                    {Number(selectedCourseSummary.sessionsPresent || 0)}
                  </Heading>
                </Box>

                <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3} bg="blackAlpha.50">
                  <Text fontSize="xs" color="blackAlpha.700">
                    Sessions Total
                  </Text>
                  <Heading size="md" mt={1} color="scms.ink">
                    {Number(selectedCourseSummary.totalSessions || 0)}
                  </Heading>
                </Box>

                <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3} bg="blackAlpha.50">
                  <Text fontSize="xs" color="blackAlpha.700">
                    Attendance
                  </Text>
                  <Heading size="md" mt={1} color="scms.ink">
                    {Number(selectedCourseSummary.percentage || 0).toFixed(1)}%
                  </Heading>
                </Box>

                <Box borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3} bg="blackAlpha.50">
                  <Text fontSize="xs" color="blackAlpha.700">
                    Sessions Absent
                  </Text>
                  <Heading size="md" mt={1} color="scms.ink">
                    {Number(selectedCourseSummary.sessionsAbsent || 0)}
                  </Heading>
                </Box>
              </Grid>
            </Box>

            <Grid templateColumns={{ base: '1fr', xl: '1.5fr 1fr' }} gap={4}>
              <Box
                bg="white"
                borderWidth="1px"
                borderColor="blackAlpha.100"
                borderRadius="card"
                boxShadow="card"
                p={{ base: 4, md: 5 }}
              >
                <Heading size="md" color="scms.ink" mb={4}>
                  Calendar View
                </Heading>

                <VStack align="stretch" gap={2}>
                  <Grid templateColumns="repeat(7, minmax(0, 1fr))" gap={2}>
                    {WEEKDAY_HEADERS.map((header) => (
                      <Text key={header} textAlign="center" fontSize="xs" fontWeight="semibold" color="blackAlpha.700">
                        {header}
                      </Text>
                    ))}
                  </Grid>

                  {monthGrid.rows.map((row, rowIndex) => (
                    <Grid key={rowIndex} templateColumns="repeat(7, minmax(0, 1fr))" gap={2}>
                      {row.map((cell) => {
                        const isPresent = cell.status === 'present';
                        const isAbsent = cell.status === 'absent';

                        return (
                          <VStack
                            key={cell.dateKey}
                            gap={1}
                            py={1.5}
                            borderRadius="lg"
                            bg={
                              isPresent
                                ? 'green.100'
                                : isAbsent
                                ? 'red.100'
                                : 'blackAlpha.100'
                            }
                            borderWidth="1px"
                            borderColor={
                              isPresent
                                ? 'green.200'
                                : isAbsent
                                ? 'red.200'
                                : 'blackAlpha.200'
                            }
                            opacity={cell.inCurrentMonth ? 1 : 0.5}
                          >
                            <Text fontSize="xs" color="blackAlpha.700">
                              {cell.dayNumber}
                            </Text>
                            <Flex
                              w="20px"
                              h="20px"
                              borderRadius="full"
                              align="center"
                              justify="center"
                              bg={isPresent ? 'green.500' : isAbsent ? 'red.500' : 'blackAlpha.400'}
                              color="white"
                            >
                              <Icon as={isPresent ? FiCheck : FiX} boxSize={3} />
                            </Flex>
                          </VStack>
                        );
                      })}
                    </Grid>
                  ))}
                </VStack>
              </Box>

              <Box
                bg="white"
                borderWidth="1px"
                borderColor="blackAlpha.100"
                borderRadius="card"
                boxShadow="card"
                p={{ base: 4, md: 5 }}
              >
                <HStack justify="space-between" align="center" mb={4}>
                  <Heading size="md" color="scms.ink">
                    Status Breakdown
                  </Heading>
                  <Icon as={FiPieChart} boxSize={4} color="blackAlpha.700" />
                </HStack>

                {chartTotal > 0 ? (
                  <Box w="100%" h="240px">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={54}
                          outerRadius={86}
                          paddingAngle={2}
                        >
                          {chartData.map((item, index) => (
                            <Cell key={item.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} sessions`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                ) : (
                  <Text fontSize="sm" color="blackAlpha.700">
                    No attendance records available for charting.
                  </Text>
                )}

                <VStack align="stretch" gap={2} mt={3}>
                  {chartData.map((item, index) => (
                    <Flex
                      key={item.name}
                      align="center"
                      justify="space-between"
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="lg"
                      px={3}
                      py={2}
                    >
                      <HStack gap={2}>
                        <Box w="10px" h="10px" borderRadius="full" bg={DONUT_COLORS[index]} />
                        <Text fontSize="sm" color="scms.ink">
                          {item.name}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" fontWeight="medium" color="blackAlpha.700">
                        {item.value}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              </Box>
            </Grid>
          </>
        ) : (
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 6, md: 8 }}
          >
            <Text color="blackAlpha.700">No attendance records available yet.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function FacultyAttendanceView({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(todayDateOnly());
  const [statusByStudentId, setStatusByStudentId] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'percentage', direction: 'asc' });

  const activeView = searchParams.get('view') === 'summary' ? 'summary' : 'mark';
  const selectedCourseId = Number(searchParams.get('courseId')) || null;

  const coursesQuery = useQuery({
    queryKey: ['faculty-attendance', 'courses'],
    queryFn: fetchFacultyCourses,
    enabled: user?.role === 'faculty',
  });

  useEffect(() => {
    if (!coursesQuery.isSuccess || selectedCourseId || !coursesQuery.data.length) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('courseId', String(coursesQuery.data[0].id));
    setSearchParams(next, { replace: true });
  }, [coursesQuery.data, coursesQuery.isSuccess, searchParams, selectedCourseId, setSearchParams]);

  const courseDetailsQuery = useQuery({
    queryKey: ['faculty-attendance', 'course-detail', selectedCourseId],
    queryFn: () => fetchCourseDetails(selectedCourseId),
    enabled: Boolean(selectedCourseId),
  });

  const attendanceForDateQuery = useQuery({
    queryKey: ['faculty-attendance', 'session', selectedCourseId, selectedDate],
    queryFn: () => fetchAttendanceForDate(selectedCourseId, selectedDate),
    enabled: Boolean(selectedCourseId),
  });

  const summaryQuery = useQuery({
    queryKey: ['faculty-attendance', 'summary', selectedCourseId],
    queryFn: () => fetchCourseAttendanceSummary(selectedCourseId),
    enabled: Boolean(selectedCourseId),
  });

  useEffect(() => {
    if (!courseDetailsQuery.data?.enrolledStudents) {
      return;
    }

    const defaults = {};

    courseDetailsQuery.data.enrolledStudents.forEach((student) => {
      defaults[Number(student.id)] = 'absent';
    });

    (attendanceForDateQuery.data?.items || []).forEach((item) => {
      defaults[Number(item.student?.id)] = item.status;
    });

    setStatusByStudentId(defaults);
  }, [attendanceForDateQuery.data?.items, courseDetailsQuery.data?.enrolledStudents]);

  const submitMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/attendance/mark', payload),
    onSuccess: async () => {
      toaster.success({
        title: 'Attendance submitted',
        description: 'Session attendance has been saved successfully.',
        duration: 3000,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['faculty-attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-courses'] }),
        queryClient.invalidateQueries({ queryKey: ['faculty-roster'] }),
      ]);

      navigate(`/courses?courseId=${selectedCourseId}`);
    },
    onError: (error) => {
      toaster.error({
        title: 'Unable to submit attendance',
        description:
          error?.response?.data?.message || error?.message || 'Please check and try again.',
        duration: 5000,
      });
    },
  });

  const summaryRows = useMemo(() => {
    const rows = [...(summaryQuery.data?.students || [])];

    rows.sort((first, second) => {
      if (sortConfig.key === 'name') {
        const result = String(first.name || '').localeCompare(String(second.name || ''));
        return sortConfig.direction === 'asc' ? result : -result;
      }

      const firstValue = Number(first[sortConfig.key] || 0);
      const secondValue = Number(second[sortConfig.key] || 0);
      const result = firstValue - secondValue;
      return sortConfig.direction === 'asc' ? result : -result;
    });

    return rows;
  }, [sortConfig.direction, sortConfig.key, summaryQuery.data?.students]);

  const isPageLoading =
    coursesQuery.isPending ||
    (Boolean(selectedCourseId) &&
      (courseDetailsQuery.isPending || attendanceForDateQuery.isPending || summaryQuery.isPending));

  const pageError =
    coursesQuery.error ||
    courseDetailsQuery.error ||
    attendanceForDateQuery.error ||
    summaryQuery.error;

  const changeView = (view) => {
    const next = new URLSearchParams(searchParams);
    if (selectedCourseId) {
      next.set('courseId', String(selectedCourseId));
    }

    if (view === 'summary') {
      next.set('view', 'summary');
    } else {
      next.delete('view');
    }

    setSearchParams(next);
  };

  const changeCourse = (courseId) => {
    const next = new URLSearchParams(searchParams);
    next.set('courseId', String(courseId));
    setSearchParams(next);
  };

  const toggleStatus = (studentId, status) => {
    setStatusByStudentId((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  };

  const submitAttendance = () => {
    if (!selectedCourseId) {
      return;
    }

    const records = (courseDetailsQuery.data?.enrolledStudents || []).map((student) => ({
      studentId: Number(student.id),
      status: statusByStudentId[Number(student.id)] || 'absent',
    }));

    submitMutation.mutate({
      courseId: selectedCourseId,
      date: selectedDate,
      records,
    });
  };

  const changeSort = (nextKey) => {
    setSortConfig((previous) => {
      if (previous.key === nextKey) {
        return {
          key: nextKey,
          direction: previous.direction === 'asc' ? 'desc' : 'asc',
        };
      }

      return {
        key: nextKey,
        direction: 'asc',
      };
    });
  };

  const exportCsv = () => {
    if (!summaryRows.length || !selectedCourseId) {
      return;
    }

    const header = ['Student Name', 'Email', 'Total Sessions', 'Present', 'Absent', 'Late', 'Percentage'];
    const lines = summaryRows.map((row) => [
      row.name,
      row.email,
      Number(row.totalSessions || 0),
      Number(row.sessionsPresent || 0),
      Number(row.sessionsAbsent || 0),
      Number(row.sessionsLate || 0),
      Number(row.percentage || 0).toFixed(2),
    ]);

    const csvContent = [header, ...lines]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `attendance-summary-course-${selectedCourseId}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Mark Attendance
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Record session attendance and review sortable course attendance summary.
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
                onClick={() => changeCourse(course.id)}
              >
                {course.courseName}
              </Button>
            );
          })}
        </HStack>
      ) : null}

      <HStack gap={2} flexWrap="wrap">
        <Button
          size="sm"
          borderRadius="full"
          borderWidth="1px"
          borderColor={activeView === 'mark' ? 'scms.navActive' : 'blackAlpha.200'}
          bg={activeView === 'mark' ? 'scms.navActive' : 'white'}
          color={activeView === 'mark' ? 'white' : 'blackAlpha.800'}
          _hover={{ bg: activeView === 'mark' ? 'scms.navActive' : 'blackAlpha.50' }}
          onClick={() => changeView('mark')}
        >
          Mark Session
        </Button>

        <Button
          size="sm"
          borderRadius="full"
          borderWidth="1px"
          borderColor={activeView === 'summary' ? 'scms.navActive' : 'blackAlpha.200'}
          bg={activeView === 'summary' ? 'scms.navActive' : 'white'}
          color={activeView === 'summary' ? 'white' : 'blackAlpha.800'}
          _hover={{ bg: activeView === 'summary' ? 'scms.navActive' : 'blackAlpha.50' }}
          onClick={() => changeView('summary')}
        >
          Attendance Summary
        </Button>
      </HStack>

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
        <ErrorAlert
          title="Unable to load attendance page"
          message={
            pageError?.response?.data?.message ||
            pageError?.message ||
            'Please refresh and try again.'
          }
        />
      ) : null}

      {!isPageLoading && !pageError ? (
        coursesQuery.data?.length ? (
          activeView === 'mark' ? (
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
                    {courseDetailsQuery.data?.courseName || 'Selected Course'}
                  </Heading>
                  <Text mt={1} fontSize="sm" color="blackAlpha.700">
                    {(courseDetailsQuery.data?.enrolledStudents || []).length} students |{' '}
                    {courseDetailsQuery.data?.departmentName || '--'}
                  </Text>
                </Box>

                <HStack gap={2}>
                  <Text fontSize="sm" color="blackAlpha.700">
                    Session Date
                  </Text>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    size="sm"
                    maxW="180px"
                  />
                </HStack>
              </Flex>

              {(courseDetailsQuery.data?.enrolledStudents || []).length ? (
                <VStack align="stretch" gap={3}>
                  {(courseDetailsQuery.data?.enrolledStudents || []).map((student) => {
                    const selectedStatus = statusByStudentId[Number(student.id)] || 'absent';

                    return (
                      <Flex
                        key={student.id}
                        justify="space-between"
                        align={{ base: 'start', lg: 'center' }}
                        direction={{ base: 'column', lg: 'row' }}
                        gap={3}
                        borderWidth="1px"
                        borderColor="blackAlpha.100"
                        borderRadius="xl"
                        px={3}
                        py={3}
                      >
                        <Box>
                          <Text fontWeight="medium" color="scms.ink">
                            {student.name}
                          </Text>
                          <Text fontSize="sm" color="blackAlpha.700">
                            {student.email}
                          </Text>
                        </Box>

                        <HStack gap={2} flexWrap="wrap">
                          {FACULTY_STATUS_OPTIONS.map((option) => {
                            const active = selectedStatus === option.key;

                            return (
                              <Button
                                key={option.key}
                                size="xs"
                                borderRadius="full"
                                borderWidth="1px"
                                borderColor={active ? option.bg : 'blackAlpha.200'}
                                bg={active ? option.bg : 'white'}
                                color={active ? 'white' : 'blackAlpha.800'}
                                _hover={{ bg: active ? option.hoverBg : 'blackAlpha.50' }}
                                onClick={() => toggleStatus(Number(student.id), option.key)}
                              >
                                {option.label}
                              </Button>
                            );
                          })}
                        </HStack>
                      </Flex>
                    );
                  })}

                  <Flex justify="end" pt={2}>
                    <Button
                      bg="scms.navActive"
                      color="white"
                      _hover={{ opacity: 0.92 }}
                      onClick={submitAttendance}
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting...' : 'Submit Attendance'}
                    </Button>
                  </Flex>
                </VStack>
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
          ) : (
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
                    {summaryQuery.data?.course?.courseName || 'Course Summary'}
                  </Heading>
                  <Text mt={1} fontSize="sm" color="blackAlpha.700">
                    Sort by column headers. Rows below 75% are highlighted.
                  </Text>
                </Box>

                <Button size="sm" variant="outline" onClick={exportCsv}>
                  <HStack gap={2}>
                    <FiDownload />
                    <Text>Export CSV</Text>
                  </HStack>
                </Button>
              </Flex>

              {summaryRows.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>
                          <Button size="xs" variant="ghost" onClick={() => changeSort('name')}>
                            Student Name
                          </Button>
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="right">
                          <Button size="xs" variant="ghost" onClick={() => changeSort('totalSessions')}>
                            Total Sessions
                          </Button>
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="right">
                          <Button size="xs" variant="ghost" onClick={() => changeSort('sessionsPresent')}>
                            Present
                          </Button>
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="right">
                          <Button size="xs" variant="ghost" onClick={() => changeSort('sessionsAbsent')}>
                            Absent
                          </Button>
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="right">
                          <Button size="xs" variant="ghost" onClick={() => changeSort('sessionsLate')}>
                            Late
                          </Button>
                        </TableColumnHeader>
                        <TableColumnHeader textAlign="right">
                          <Button size="xs" variant="ghost" onClick={() => changeSort('percentage')}>
                            Percentage
                          </Button>
                        </TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryRows.map((student) => (
                        <TableRow
                          key={student.id}
                          bg={Number(student.percentage || 0) < 75 ? 'orange.50' : 'transparent'}
                        >
                          <TableCell>
                            <Text fontWeight="medium" color="scms.ink">
                              {student.name}
                            </Text>
                            <Text fontSize="xs" color="blackAlpha.700">
                              {student.email}
                            </Text>
                          </TableCell>
                          <TableCell textAlign="right">{Number(student.totalSessions || 0)}</TableCell>
                          <TableCell textAlign="right">{Number(student.sessionsPresent || 0)}</TableCell>
                          <TableCell textAlign="right">{Number(student.sessionsAbsent || 0)}</TableCell>
                          <TableCell textAlign="right">{Number(student.sessionsLate || 0)}</TableCell>
                          <TableCell textAlign="right">
                            <Badge
                              bg={Number(student.percentage || 0) < 75 ? 'orange.100' : 'green.100'}
                              color={Number(student.percentage || 0) < 75 ? 'orange.800' : 'green.800'}
                              borderRadius="full"
                              px={2.5}
                              py={1}
                            >
                              {Number(student.percentage || 0).toFixed(2)}%
                            </Badge>
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
                  <Text color="blackAlpha.700">No attendance summary data available yet.</Text>
                </Box>
              )}
            </Box>
          )
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

function AttendancePage() {
  const { user } = useAuth();

  if (user?.role === 'student') {
    return <StudentAttendanceView user={user} />;
  }

  if (user?.role === 'faculty') {
    return <FacultyAttendanceView user={user} />;
  }

  return (
    <PagePlaceholder
      title="Attendance"
      description="Admin attendance tools are delivered in the admin phase."
    />
  );
}

export default AttendancePage;
