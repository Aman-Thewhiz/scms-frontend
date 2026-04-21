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
  Heading,
  HStack,
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
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const CHART_COLORS = {
  line: 'var(--chakra-colors-scms-navActive)',
  studentBar: 'var(--chakra-colors-scms-statusGreen)',
  attendanceBar: 'var(--chakra-colors-scms-statusOrange)',
  text: 'var(--chakra-colors-scms-ink)',
  grid: 'rgba(17, 24, 39, 0.1)',
};

function getErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

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
  });
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

async function fetchAnalyticsOverview() {
  const response = await apiClient.get('/analytics/overview');
  return response?.data?.data || null;
}

async function fetchAttendanceTrend() {
  const response = await apiClient.get('/analytics/attendance-trend');
  return response?.data?.data || [];
}

async function fetchDepartmentStats() {
  const response = await apiClient.get('/analytics/department-stats');
  return response?.data?.data || [];
}

async function fetchTopPerformers() {
  const response = await apiClient.get('/analytics/top-performers');
  return response?.data?.data || { topStudents: [], topCourses: [] };
}

function AnalyticsPage() {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <PagePlaceholder
        title="Analytics"
        description="Analytics dashboards are available for admins only."
      />
    );
  }

  const overviewQuery = useQuery({
    queryKey: ['admin-analytics', 'overview'],
    queryFn: fetchAnalyticsOverview,
  });

  const attendanceTrendQuery = useQuery({
    queryKey: ['admin-analytics', 'attendance-trend'],
    queryFn: fetchAttendanceTrend,
  });

  const departmentStatsQuery = useQuery({
    queryKey: ['admin-analytics', 'department-stats'],
    queryFn: fetchDepartmentStats,
  });

  const topPerformersQuery = useQuery({
    queryKey: ['admin-analytics', 'top-performers'],
    queryFn: fetchTopPerformers,
  });

  const attendanceTrendChartData = useMemo(
    () =>
      (attendanceTrendQuery.data || []).map((entry) => ({
        ...entry,
        dayLabel: formatDateLabel(entry.date),
      })),
    [attendanceTrendQuery.data]
  );

  const departmentChartData = useMemo(
    () =>
      (departmentStatsQuery.data || []).map((entry) => ({
        ...entry,
        shortName:
          String(entry.departmentName || '').length > 12
            ? `${String(entry.departmentName).slice(0, 12)}...`
            : entry.departmentName,
      })),
    [departmentStatsQuery.data]
  );

  const topStudents = topPerformersQuery.data?.topStudents || [];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Analytics Dashboard
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Campus-level KPIs and trends for academic operations.
        </Text>
      </Box>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={4}>
        {overviewQuery.isPending ? (
          Array.from({ length: 4 }).map((_, index) => (
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
                <Skeleton height="14px" borderRadius="md" />
                <Skeleton height="22px" borderRadius="md" />
                <Skeleton height="12px" borderRadius="md" />
              </VStack>
            </Box>
          ))
        ) : overviewQuery.isError ? (
          <Box gridColumn={{ md: 'span 2', xl: 'span 4' }}>
            <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>Unable to load analytics overview</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(overviewQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </AlertContent>
            </AlertRoot>
          </Box>
        ) : (
          <>
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="sm" color="blackAlpha.700">
                Total Students
              </Text>
              <Heading mt={2} size="lg" color="scms.ink">
                {formatNumber(overviewQuery.data?.totalStudents)}
              </Heading>
            </Box>

            <Box
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="sm" color="blackAlpha.700">
                Total Faculty
              </Text>
              <Heading mt={2} size="lg" color="scms.ink">
                {formatNumber(overviewQuery.data?.totalFaculty)}
              </Heading>
            </Box>

            <Box
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="sm" color="blackAlpha.700">
                Attendance Rate
              </Text>
              <Heading mt={2} size="lg" color="scms.ink">
                {Number(overviewQuery.data?.overallAttendanceRate || 0).toFixed(1)}%
              </Heading>
            </Box>

            <Box
              bg="white"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="card"
              boxShadow="card"
              p={{ base: 4, md: 5 }}
            >
              <Text fontSize="sm" color="blackAlpha.700">
                Average GPA
              </Text>
              <Heading mt={2} size="lg" color="scms.ink">
                {Number(overviewQuery.data?.averageGpa || 0).toFixed(2)}
              </Heading>
            </Box>
          </>
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
          <Heading size="md" color="scms.ink" mb={4}>
            Attendance Trend (Last 30 Days)
          </Heading>

          {attendanceTrendQuery.isPending ? (
            <Skeleton height="320px" borderRadius="xl" />
          ) : attendanceTrendQuery.isError ? (
            <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>Unable to load attendance trend</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(attendanceTrendQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </AlertContent>
            </AlertRoot>
          ) : (
            <Box w="100%" h="320px">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceTrendChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="dayLabel" tick={{ fill: CHART_COLORS.text, fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [`${Number(value || 0).toFixed(1)}%`, 'Attendance']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendanceRate"
                    stroke={CHART_COLORS.line}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5 }}
                    name="Attendance Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
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
          <Heading size="md" color="scms.ink" mb={4}>
            Department Stats
          </Heading>

          {departmentStatsQuery.isPending ? (
            <Skeleton height="320px" borderRadius="xl" />
          ) : departmentStatsQuery.isError ? (
            <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
              <AlertIndicator />
              <AlertContent>
                <AlertTitle>Unable to load department stats</AlertTitle>
                <AlertDescription>
                  {getErrorMessage(departmentStatsQuery.error, 'Please refresh and try again.')}
                </AlertDescription>
              </AlertContent>
            </AlertRoot>
          ) : (
            <Box w="100%" h="320px">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentChartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={CHART_COLORS.grid} />
                  <XAxis dataKey="shortName" tick={{ fill: CHART_COLORS.text, fontSize: 11 }} />
                  <YAxis tick={{ fill: CHART_COLORS.text, fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="studentCount" fill={CHART_COLORS.studentBar} name="Students" radius={[6, 6, 0, 0]} />
                  <Bar
                    dataKey="averageAttendanceRate"
                    fill={CHART_COLORS.attendanceBar}
                    name="Avg Attendance %"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </SimpleGrid>

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
            Top Performers
          </Heading>
          <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
            Top 5 Students by GPA
          </Badge>
        </HStack>

        {topPerformersQuery.isPending ? (
          <VStack align="stretch" gap={3}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height="18px" borderRadius="md" />
            ))}
          </VStack>
        ) : topPerformersQuery.isError ? (
          <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
            <AlertIndicator />
            <AlertContent>
              <AlertTitle>Unable to load top performers</AlertTitle>
              <AlertDescription>
                {getErrorMessage(topPerformersQuery.error, 'Please refresh and try again.')}
              </AlertDescription>
            </AlertContent>
          </AlertRoot>
        ) : topStudents.length ? (
          <TableScrollArea>
            <TableRoot size="sm">
              <TableHeader>
                <TableRow>
                  <TableColumnHeader>Rank</TableColumnHeader>
                  <TableColumnHeader>Name</TableColumnHeader>
                  <TableColumnHeader>Roll Number</TableColumnHeader>
                  <TableColumnHeader>Department</TableColumnHeader>
                  <TableColumnHeader textAlign="right">GPA</TableColumnHeader>
                  <TableColumnHeader textAlign="right">Graded Records</TableColumnHeader>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topStudents.map((student, index) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <Badge
                        bg={index < 3 ? 'orange.100' : 'blackAlpha.100'}
                        color={index < 3 ? 'orange.800' : 'blackAlpha.800'}
                        borderRadius="full"
                        px={2.5}
                        py={1}
                      >
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text fontWeight="medium" color="scms.ink">
                        {student.name}
                      </Text>
                    </TableCell>
                    <TableCell>{student.rollNumber}</TableCell>
                    <TableCell>{student.departmentName}</TableCell>
                    <TableCell textAlign="right">{Number(student.gpa || 0).toFixed(2)}</TableCell>
                    <TableCell textAlign="right">{formatNumber(student.gradedRecords)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </TableRoot>
          </TableScrollArea>
        ) : (
          <Text color="blackAlpha.700">No top performer data is available yet.</Text>
        )}
      </Box>
    </VStack>
  );
}

export default AnalyticsPage;
