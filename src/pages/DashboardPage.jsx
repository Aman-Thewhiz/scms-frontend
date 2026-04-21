import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Heading,
  HStack,
  Icon,
  SimpleGrid,
  Skeleton,
  TableBody,
  TableCell,
  TableColumnHeader,
  TableHeader,
  TableRoot,
  TableRow,
  TableScrollArea,
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
  Text,
  VStack,
} from '@chakra-ui/react';
import { NavLink } from 'react-router-dom';
import {
  FiArrowUpRight,
  FiBookOpen,
  FiCalendar,
  FiCheck,
  FiClock,
  FiFileText,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_TASKS = [
  {
    id: 1,
    title: 'Database normalization worksheet',
    subject: 'DBMS',
    dueDate: '2026-04-24',
    status: 'todo',
  },
  {
    id: 2,
    title: 'Operating systems quiz prep',
    subject: 'Operating Systems',
    dueDate: '2026-04-25',
    status: 'in-progress',
  },
  {
    id: 3,
    title: 'Computer networks lab report',
    subject: 'Computer Networks',
    dueDate: '2026-04-27',
    status: 'done',
  },
  {
    id: 4,
    title: 'UI prototype review notes',
    subject: 'Design Studio',
    dueDate: '2026-04-28',
    status: 'todo',
  },
];

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

function toLocalDateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
  if (!value) {
    return 'N/A';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function statusBadgeStyles(status) {
  if (status === 'done') {
    return {
      bg: 'green.100',
      color: 'green.800',
      label: 'Done',
    };
  }

  if (status === 'in-progress') {
    return {
      bg: 'orange.100',
      color: 'orange.800',
      label: 'In Progress',
    };
  }

  return {
    bg: 'blackAlpha.800',
    color: 'white',
    label: 'To Do',
  };
}

function normalizeAttendanceStatus(status) {
  if (status === 'present' || status === 'late') {
    return 'present';
  }

  if (status === 'absent') {
    return 'absent';
  }

  return 'none';
}

function aggregateAttendanceByDate(courses = []) {
  const scoreByDate = new Map();
  const statusByDate = new Map();

  courses.forEach((courseItem) => {
    (courseItem?.last30Days || []).forEach((entry) => {
      const date = entry?.date;
      if (!date) {
        return;
      }

      const normalized = normalizeAttendanceStatus(entry.status);
      const score = normalized === 'present' ? 2 : normalized === 'absent' ? 1 : 0;
      const existing = scoreByDate.get(date) || 0;

      if (score >= existing) {
        scoreByDate.set(date, score);
        statusByDate.set(date, normalized);
      }
    });
  });

  return statusByDate;
}

function buildAttendanceMonthGrid(courses = []) {
  const statusByDate = aggregateAttendanceByDate(courses);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

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

function getGpaTrend(bySemester = []) {
  if (!Array.isArray(bySemester) || bySemester.length < 2) {
    return 'Trend unlocks after two graded semesters';
  }

  const ordered = [...bySemester].sort((first, second) => Number(second.semester) - Number(first.semester));
  const currentGpa = Number(ordered[0]?.gpa || 0);
  const previousGpa = Number(ordered[1]?.gpa || 0);

  if (previousGpa <= 0) {
    return 'Not enough history for semester comparison';
  }

  const delta = ((currentGpa - previousGpa) / previousGpa) * 100;

  if (delta >= 0) {
    return `${Math.abs(delta).toFixed(1)}% higher than last semester`;
  }

  return `${Math.abs(delta).toFixed(1)}% lower than last semester`;
}

function getAttendanceTrend(courses = []) {
  const statusByDate = aggregateAttendanceByDate(courses);
  const orderedDates = [...statusByDate.keys()].sort((first, second) => first.localeCompare(second));

  if (orderedDates.length < 8) {
    return 'Trend updates as more sessions are recorded';
  }

  const midpoint = Math.floor(orderedDates.length / 2);
  const previousDates = orderedDates.slice(0, midpoint);
  const recentDates = orderedDates.slice(midpoint);

  const previousRate =
    previousDates.filter((date) => statusByDate.get(date) === 'present').length /
    Math.max(previousDates.length, 1);
  const recentRate =
    recentDates.filter((date) => statusByDate.get(date) === 'present').length /
    Math.max(recentDates.length, 1);

  const delta = (recentRate - previousRate) * 100;

  if (delta >= 0) {
    return `${Math.abs(delta).toFixed(1)}% better than the previous period`;
  }

  return `${Math.abs(delta).toFixed(1)}% lower than the previous period`;
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

function MetricCard({ title, value, trend, icon }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="card"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <Flex align="start" justify="space-between" gap={3}>
        <Box>
          <Text fontSize="sm" color="blackAlpha.700">
            {title}
          </Text>
          <Heading size="lg" mt={2} color="scms.ink">
            {value}
          </Heading>
        </Box>

        <Flex
          w="34px"
          h="34px"
          borderRadius="full"
          bg="blackAlpha.100"
          align="center"
          justify="center"
          color="blackAlpha.700"
        >
          <Icon as={icon || FiArrowUpRight} boxSize={4} />
        </Flex>
      </Flex>

      <Text mt={3} fontSize="sm" color="blackAlpha.700">
        {trend}
      </Text>
    </Box>
  );
}

function SectionLoadingCard({ lines = 4 }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="card"
      boxShadow="card"
      p={{ base: 4, md: 5 }}
    >
      <VStack align="stretch" gap={3}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} height="16px" borderRadius="md" />
        ))}
      </VStack>
    </Box>
  );
}

async function fetchStudentGpa(studentId) {
  const response = await apiClient.get(`/results/gpa/${studentId}`);
  return response?.data?.data || null;
}

async function fetchStudentAttendanceSummary() {
  const response = await apiClient.get('/attendance/my-summary');
  return response?.data?.data || null;
}

async function fetchTodaySchedule() {
  const response = await apiClient.get('/schedule/today');
  return response?.data?.data || null;
}

async function fetchFacultyCourses(facultyId) {
  const response = await apiClient.get('/courses', {
    params: {
      facultyId,
    },
  });

  return response?.data?.data || [];
}

async function fetchOverviewAnalytics() {
  const response = await apiClient.get('/analytics/overview');
  return response?.data?.data || null;
}

async function fetchDepartmentStats() {
  const response = await apiClient.get('/analytics/department-stats');
  return response?.data?.data || [];
}

async function fetchLatestNotices(limit = 3) {
  const response = await apiClient.get('/notices', {
    params: {
      page: 1,
      limit,
    },
  });

  return response?.data?.data || { items: [], pagination: null };
}

function StudentDashboard({ user }) {
  const gpaQuery = useQuery({
    queryKey: ['dashboard', 'student', 'gpa', user?.id],
    queryFn: () => fetchStudentGpa(user.id),
    enabled: Boolean(user?.id),
  });

  const attendanceQuery = useQuery({
    queryKey: ['dashboard', 'student', 'attendance-summary'],
    queryFn: fetchStudentAttendanceSummary,
    enabled: Boolean(user?.id),
  });

  const scheduleQuery = useQuery({
    queryKey: ['dashboard', 'student', 'today-schedule'],
    queryFn: fetchTodaySchedule,
    enabled: Boolean(user?.id),
  });

  const attendanceGrid = useMemo(
    () => buildAttendanceMonthGrid(attendanceQuery.data?.courses || []),
    [attendanceQuery.data?.courses]
  );

  const tabbedTasks = useMemo(
    () => ({
      all: MOCK_TASKS,
      todo: MOCK_TASKS.filter((task) => task.status === 'todo'),
      inProgress: MOCK_TASKS.filter((task) => task.status === 'in-progress'),
      done: MOCK_TASKS.filter((task) => task.status === 'done'),
    }),
    []
  );

  const gpaValue = Number(gpaQuery.data?.cumulative?.gpa || 0).toFixed(2);
  const gpaTrendText = getGpaTrend(gpaQuery.data?.bySemester || []);

  const attendanceRate = Number(attendanceQuery.data?.overall?.percentage || 0);
  const attendanceTrendText = getAttendanceTrend(attendanceQuery.data?.courses || []);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Student Dashboard
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          A quick snapshot of your semester progress.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {gpaQuery.isPending ? (
          <SectionLoadingCard lines={4} />
        ) : gpaQuery.isError ? (
          <ErrorAlert
            title="Unable to load GPA"
            message={getErrorMessage(gpaQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
          <MetricCard title="Cumulative GPA" value={gpaValue} trend={gpaTrendText} icon={FiTrendingUp} />
        )}

        {attendanceQuery.isPending ? (
          <SectionLoadingCard lines={4} />
        ) : attendanceQuery.isError ? (
          <ErrorAlert
            title="Unable to load attendance"
            message={getErrorMessage(attendanceQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
          <MetricCard
            title="On-time Attendance"
            value={formatPercent(attendanceRate)}
            trend={attendanceTrendText}
            icon={FiCalendar}
          />
        )}
      </SimpleGrid>

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
            My Tasks
          </Heading>
          <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
            Mock Data
          </Badge>
        </Flex>

        <TabsRoot defaultValue="all" fitted>
          <TabsList mb={4} bg="blackAlpha.50" borderRadius="full" p={1}>
            <TabsTrigger value="all" borderRadius="full">
              All
            </TabsTrigger>
            <TabsTrigger value="todo" borderRadius="full">
              To Do
            </TabsTrigger>
            <TabsTrigger value="inProgress" borderRadius="full">
              In Progress
            </TabsTrigger>
            <TabsTrigger value="done" borderRadius="full">
              Done
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {tabbedTasks.all.length ? (
              <VStack align="stretch" gap={3}>
                {tabbedTasks.all.map((task) => {
                  const badge = statusBadgeStyles(task.status);

                  return (
                    <Flex
                      key={task.id}
                      justify="space-between"
                      align={{ base: 'start', md: 'center' }}
                      direction={{ base: 'column', md: 'row' }}
                      gap={2}
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3}
                      py={3}
                    >
                      <Box>
                        <Text fontWeight="medium" color="scms.ink">
                          {task.title}
                        </Text>
                        <Text fontSize="sm" color="blackAlpha.700">
                          {task.subject} | Due {formatDateLabel(task.dueDate)}
                        </Text>
                      </Box>

                      <Badge bg={badge.bg} color={badge.color} borderRadius="full" px={2.5} py={1}>
                        {badge.label}
                      </Badge>
                    </Flex>
                  );
                })}
              </VStack>
            ) : (
              <Text color="blackAlpha.700" fontSize="sm">
                No tasks available right now.
              </Text>
            )}
          </TabsContent>

          <TabsContent value="todo">
            {tabbedTasks.todo.length ? (
              <VStack align="stretch" gap={3}>
                {tabbedTasks.todo.map((task) => {
                  const badge = statusBadgeStyles(task.status);

                  return (
                    <Flex key={task.id} justify="space-between" align="center" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                      <Box>
                        <Text fontWeight="medium" color="scms.ink">
                          {task.title}
                        </Text>
                        <Text fontSize="sm" color="blackAlpha.700">
                          {task.subject} | Due {formatDateLabel(task.dueDate)}
                        </Text>
                      </Box>
                      <Badge bg={badge.bg} color={badge.color} borderRadius="full" px={2.5} py={1}>
                        {badge.label}
                      </Badge>
                    </Flex>
                  );
                })}
              </VStack>
            ) : (
              <Text color="blackAlpha.700" fontSize="sm">
                No tasks are currently marked To Do.
              </Text>
            )}
          </TabsContent>

          <TabsContent value="inProgress">
            {tabbedTasks.inProgress.length ? (
              <VStack align="stretch" gap={3}>
                {tabbedTasks.inProgress.map((task) => {
                  const badge = statusBadgeStyles(task.status);

                  return (
                    <Flex key={task.id} justify="space-between" align="center" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                      <Box>
                        <Text fontWeight="medium" color="scms.ink">
                          {task.title}
                        </Text>
                        <Text fontSize="sm" color="blackAlpha.700">
                          {task.subject} | Due {formatDateLabel(task.dueDate)}
                        </Text>
                      </Box>
                      <Badge bg={badge.bg} color={badge.color} borderRadius="full" px={2.5} py={1}>
                        {badge.label}
                      </Badge>
                    </Flex>
                  );
                })}
              </VStack>
            ) : (
              <Text color="blackAlpha.700" fontSize="sm">
                No tasks are in progress.
              </Text>
            )}
          </TabsContent>

          <TabsContent value="done">
            {tabbedTasks.done.length ? (
              <VStack align="stretch" gap={3}>
                {tabbedTasks.done.map((task) => {
                  const badge = statusBadgeStyles(task.status);

                  return (
                    <Flex key={task.id} justify="space-between" align="center" borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                      <Box>
                        <Text fontWeight="medium" color="scms.ink">
                          {task.title}
                        </Text>
                        <Text fontSize="sm" color="blackAlpha.700">
                          {task.subject} | Due {formatDateLabel(task.dueDate)}
                        </Text>
                      </Box>
                      <Badge bg={badge.bg} color={badge.color} borderRadius="full" px={2.5} py={1}>
                        {badge.label}
                      </Badge>
                    </Flex>
                  );
                })}
              </VStack>
            ) : (
              <Text color="blackAlpha.700" fontSize="sm">
                No completed tasks yet.
              </Text>
            )}
          </TabsContent>
        </TabsRoot>
      </Box>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
        {attendanceQuery.isPending ? (
          <SectionLoadingCard lines={10} />
        ) : attendanceQuery.isError ? (
          <ErrorAlert
            title="Attendance grid unavailable"
            message={getErrorMessage(attendanceQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
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
                Class Attendance
              </Heading>
              <Text fontSize="sm" color="blackAlpha.700">
                {attendanceGrid.monthLabel}
              </Text>
            </Flex>

            <VStack align="stretch" gap={2}>
              <SimpleGrid columns={7} gap={2}>
                {WEEKDAY_HEADERS.map((dayLabel) => (
                  <Text
                    key={dayLabel}
                    textAlign="center"
                    fontSize="xs"
                    fontWeight="semibold"
                    color="blackAlpha.700"
                  >
                    {dayLabel}
                  </Text>
                ))}
              </SimpleGrid>

              {attendanceGrid.rows.map((row, rowIndex) => (
                <SimpleGrid key={rowIndex} columns={7} gap={2}>
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
                </SimpleGrid>
              ))}
            </VStack>
          </Box>
        )}

        {scheduleQuery.isPending ? (
          <SectionLoadingCard lines={10} />
        ) : scheduleQuery.isError ? (
          <ErrorAlert
            title="Schedule unavailable"
            message={getErrorMessage(scheduleQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
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
                Today&apos;s Schedule
              </Heading>
              <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                {scheduleQuery.data?.day || 'Day'}
              </Badge>
            </Flex>

            {(scheduleQuery.data?.classes || []).length ? (
              <TableScrollArea>
                <TableRoot size="sm">
                  <TableHeader>
                    <TableRow>
                      <TableColumnHeader>Time</TableColumnHeader>
                      <TableColumnHeader>Course</TableColumnHeader>
                      <TableColumnHeader>Room</TableColumnHeader>
                      <TableColumnHeader>Faculty</TableColumnHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleQuery.data.classes.map((classItem) => (
                      <TableRow key={`${classItem.course.id}-${classItem.startTime}`}>
                        <TableCell>
                          {classItem.startTime} - {classItem.endTime}
                        </TableCell>
                        <TableCell>{classItem.course.courseName}</TableCell>
                        <TableCell>{classItem.location || 'TBA'}</TableCell>
                        <TableCell>{classItem.teacherName}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </TableRoot>
              </TableScrollArea>
            ) : (
              <Text color="blackAlpha.700" fontSize="sm">
                No classes scheduled for today.
              </Text>
            )}
          </Box>
        )}
      </SimpleGrid>
    </VStack>
  );
}

function FacultyDashboard({ user }) {
  const coursesQuery = useQuery({
    queryKey: ['dashboard', 'faculty', 'courses', user?.id],
    queryFn: () => fetchFacultyCourses(user.id),
    enabled: Boolean(user?.id),
  });

  const scheduleQuery = useQuery({
    queryKey: ['dashboard', 'faculty', 'today-schedule'],
    queryFn: fetchTodaySchedule,
    enabled: Boolean(user?.id),
  });

  const noticesQuery = useQuery({
    queryKey: ['dashboard', 'faculty', 'latest-notices'],
    queryFn: () => fetchLatestNotices(3),
    enabled: Boolean(user?.id),
  });

  const assignedCourses = coursesQuery.data || [];
  const todayClasses = scheduleQuery.data?.classes || [];
  const latestNotices = noticesQuery.data?.items || [];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Faculty Dashboard
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Your teaching load and quick attendance actions.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        {coursesQuery.isPending ? (
          <SectionLoadingCard lines={4} />
        ) : coursesQuery.isError ? (
          <ErrorAlert
            title="Courses unavailable"
            message={getErrorMessage(coursesQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
          <MetricCard
            title="Assigned Courses"
            value={formatNumber(assignedCourses.length)}
            trend="Pulled from your current faculty assignments"
            icon={FiBookOpen}
          />
        )}

        {scheduleQuery.isPending ? (
          <SectionLoadingCard lines={4} />
        ) : scheduleQuery.isError ? (
          <ErrorAlert
            title="Schedule unavailable"
            message={getErrorMessage(scheduleQuery.error, 'Try refreshing in a few seconds.')}
          />
        ) : (
          <MetricCard
            title="Classes Today"
            value={formatNumber(todayClasses.length)}
            trend={`${scheduleQuery.data?.day || 'Today'} | ${formatDateLabel(scheduleQuery.data?.date)}`}
            icon={FiCalendar}
          />
        )}
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
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
              Mark Attendance
            </Heading>
            <Badge bg="orange.100" color="orange.800" borderRadius="full" px={2.5} py={1}>
              Quick Link
            </Badge>
          </Flex>

          {scheduleQuery.isPending ? (
            <VStack align="stretch" gap={3}>
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
            </VStack>
          ) : scheduleQuery.isError ? (
            <ErrorAlert
              title="Could not load today&apos;s sessions"
              message={getErrorMessage(scheduleQuery.error, 'Try refreshing in a few seconds.')}
            />
          ) : todayClasses.length ? (
            <VStack align="stretch" gap={3}>
              {todayClasses.map((classItem) => (
                <Flex
                  key={`${classItem.course.id}-${classItem.startTime}`}
                  justify="space-between"
                  align={{ base: 'start', md: 'center' }}
                  direction={{ base: 'column', md: 'row' }}
                  gap={2}
                  borderWidth="1px"
                  borderColor="blackAlpha.100"
                  borderRadius="xl"
                  px={3}
                  py={3}
                >
                  <Box>
                    <Text fontWeight="medium" color="scms.ink">
                      {classItem.course.courseName}
                    </Text>
                    <HStack gap={2} color="blackAlpha.700" fontSize="sm" mt={1}>
                      <Icon as={FiClock} boxSize={3.5} />
                      <Text>
                        {classItem.startTime} - {classItem.endTime}
                      </Text>
                    </HStack>
                  </Box>

                  <Button as={NavLink} to="/attendance" bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} size="sm">
                    Mark Attendance
                  </Button>
                </Flex>
              ))}
            </VStack>
          ) : (
            <Text color="blackAlpha.700" fontSize="sm">
              No classes are scheduled for today.
            </Text>
          )}
        </Box>

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
              Latest Notices
            </Heading>
            <Button as={NavLink} to="/notices" size="sm" variant="outline">
              View All
            </Button>
          </Flex>

          {noticesQuery.isPending ? (
            <VStack align="stretch" gap={3}>
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
            </VStack>
          ) : noticesQuery.isError ? (
            <ErrorAlert
              title="Notices unavailable"
              message={getErrorMessage(noticesQuery.error, 'Try refreshing in a few seconds.')}
            />
          ) : latestNotices.length ? (
            <VStack align="stretch" gap={3}>
              {latestNotices.map((notice) => (
                <Box key={notice.id} borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                  <Text fontWeight="medium" color="scms.ink">
                    {notice.title}
                  </Text>
                  <Text mt={1} fontSize="sm" color="blackAlpha.700" noOfLines={2}>
                    {notice.body}
                  </Text>
                  <HStack mt={2} gap={2}>
                    <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                      {notice.targetRole}
                    </Badge>
                    <Text fontSize="xs" color="blackAlpha.600">
                      {formatDateLabel(notice.createdAt)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="blackAlpha.700" fontSize="sm">
              No notices available right now.
            </Text>
          )}
        </Box>
      </SimpleGrid>
    </VStack>
  );
}

function AdminDashboard({ user }) {
  const overviewQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'overview'],
    queryFn: fetchOverviewAnalytics,
    enabled: Boolean(user?.id),
  });

  const departmentStatsQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'department-stats'],
    queryFn: fetchDepartmentStats,
    enabled: Boolean(user?.id),
  });

  const noticesQuery = useQuery({
    queryKey: ['dashboard', 'admin', 'latest-notices'],
    queryFn: () => fetchLatestNotices(3),
    enabled: Boolean(user?.id),
  });

  const overview = overviewQuery.data || {};
  const departmentStats = departmentStatsQuery.data || [];
  const latestNotices = noticesQuery.data?.items || [];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Admin Dashboard
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Campus-wide KPIs, department performance, and notices.
        </Text>
      </Box>

      {overviewQuery.isPending ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
          <SectionLoadingCard lines={4} />
          <SectionLoadingCard lines={4} />
          <SectionLoadingCard lines={4} />
          <SectionLoadingCard lines={4} />
        </SimpleGrid>
      ) : overviewQuery.isError ? (
        <ErrorAlert
          title="Overview metrics unavailable"
          message={getErrorMessage(overviewQuery.error, 'Try refreshing in a few seconds.')}
        />
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
          <MetricCard
            title="Total Students"
            value={formatNumber(overview.totalStudents)}
            trend="Active records across all departments"
            icon={FiUsers}
          />
          <MetricCard
            title="Total Faculty"
            value={formatNumber(overview.totalFaculty)}
            trend="Currently active teaching staff"
            icon={FiUsers}
          />
          <MetricCard
            title="Total Courses"
            value={formatNumber(overview.totalCourses)}
            trend="All catalogued courses"
            icon={FiBookOpen}
          />
          <MetricCard
            title="Overall Attendance"
            value={formatPercent(overview.overallAttendanceRate)}
            trend={`Average GPA: ${Number(overview.averageGpa || 0).toFixed(2)}`}
            icon={FiTrendingUp}
          />
        </SimpleGrid>
      )}

      <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4}>
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
              Department Stats
            </Heading>
            <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
              Live
            </Badge>
          </Flex>

          {departmentStatsQuery.isPending ? (
            <VStack align="stretch" gap={3}>
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
            </VStack>
          ) : departmentStatsQuery.isError ? (
            <ErrorAlert
              title="Department stats unavailable"
              message={getErrorMessage(departmentStatsQuery.error, 'Try refreshing in a few seconds.')}
            />
          ) : departmentStats.length ? (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Department</TableColumnHeader>
                    <TableColumnHeader isNumeric>Students</TableColumnHeader>
                    <TableColumnHeader isNumeric>Faculty</TableColumnHeader>
                    <TableColumnHeader isNumeric>Courses</TableColumnHeader>
                    <TableColumnHeader isNumeric>Attendance</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentStats.map((department) => (
                    <TableRow key={department.departmentId}>
                      <TableCell>{department.departmentName}</TableCell>
                      <TableCell textAlign="right">{formatNumber(department.studentCount)}</TableCell>
                      <TableCell textAlign="right">{formatNumber(department.facultyCount)}</TableCell>
                      <TableCell textAlign="right">{formatNumber(department.courseCount)}</TableCell>
                      <TableCell textAlign="right">{formatPercent(department.averageAttendanceRate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          ) : (
            <Text color="blackAlpha.700" fontSize="sm">
              No department stats are available yet.
            </Text>
          )}
        </Box>

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
              Latest Notices
            </Heading>
            <Button as={NavLink} to="/notices" bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} size="sm">
              Post Notice
            </Button>
          </Flex>

          {noticesQuery.isPending ? (
            <VStack align="stretch" gap={3}>
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
              <Skeleton height="20px" borderRadius="md" />
            </VStack>
          ) : noticesQuery.isError ? (
            <ErrorAlert
              title="Notices unavailable"
              message={getErrorMessage(noticesQuery.error, 'Try refreshing in a few seconds.')}
            />
          ) : latestNotices.length ? (
            <VStack align="stretch" gap={3}>
              {latestNotices.map((notice) => (
                <Box key={notice.id} borderWidth="1px" borderColor="blackAlpha.100" borderRadius="xl" px={3} py={3}>
                  <HStack justify="space-between" align="start">
                    <Box>
                      <Text fontWeight="medium" color="scms.ink">
                        {notice.title}
                      </Text>
                      <Text mt={1} fontSize="sm" color="blackAlpha.700" noOfLines={2}>
                        {notice.body}
                      </Text>
                    </Box>
                    <Icon as={FiFileText} boxSize={4} color="blackAlpha.600" />
                  </HStack>

                  <HStack mt={2} gap={2}>
                    <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                      {notice.targetRole}
                    </Badge>
                    <Text fontSize="xs" color="blackAlpha.600">
                      {formatDateLabel(notice.createdAt)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          ) : (
            <Text color="blackAlpha.700" fontSize="sm">
              No notices available right now.
            </Text>
          )}
        </Box>
      </SimpleGrid>
    </VStack>
  );
}

function DashboardPage() {
  const { user } = useAuth();

  if (!user?.role) {
    return null;
  }

  if (user.role === 'student') {
    return <StudentDashboard user={user} />;
  }

  if (user.role === 'faculty') {
    return <FacultyDashboard user={user} />;
  }

  return <AdminDashboard user={user} />;
}

export default DashboardPage;
