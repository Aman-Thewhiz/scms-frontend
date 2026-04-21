import { Fragment, useMemo, useRef } from 'react';
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
  Grid,
  Heading,
  HStack,
  Icon,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiCalendar, FiClock, FiMapPin } from 'react-icons/fi';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const CLASS_COLORS = ['#E6F6FF', '#EAF9F0', '#FFF4E6', '#F3F0FF', '#FFE8EA', '#FFF9DB'];

function toMinutes(timeValue) {
  const [hourPart = '0', minutePart = '0'] = String(timeValue || '').split(':');
  return Number(hourPart) * 60 + Number(minutePart);
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

function getClassColor(courseId) {
  const numericId = Number(courseId || 0);
  return CLASS_COLORS[Math.abs(numericId) % CLASS_COLORS.length];
}

async function fetchWeekSchedule() {
  const response = await apiClient.get('/schedule/week');
  return response?.data?.data || { week: null, days: [] };
}

function SchedulePage() {
  const { user } = useAuth();
  const dayColumnRefs = useRef({});

  const weekScheduleQuery = useQuery({
    queryKey: ['student-schedule', 'week'],
    queryFn: fetchWeekSchedule,
    enabled: user?.role === 'student',
  });

  const todayDay = useMemo(() => {
    const dayName = new Date().toLocaleString('en-US', { weekday: 'short' });
    return dayName.slice(0, 3);
  }, []);

  const dayDataByName = useMemo(() => {
    const map = new Map();

    (weekScheduleQuery.data?.days || []).forEach((dayEntry) => {
      if (WEEK_DAYS.includes(dayEntry.day)) {
        map.set(dayEntry.day, dayEntry);
      }
    });

    return map;
  }, [weekScheduleQuery.data?.days]);

  const timeSlots = useMemo(() => {
    const slotMap = new Map();

    WEEK_DAYS.forEach((day) => {
      const classes = dayDataByName.get(day)?.classes || [];

      classes.forEach((classItem) => {
        const key = `${classItem.startTime}-${classItem.endTime}`;

        if (!slotMap.has(key)) {
          slotMap.set(key, {
            key,
            startTime: classItem.startTime,
            endTime: classItem.endTime,
          });
        }
      });
    });

    return [...slotMap.values()].sort(
      (first, second) => toMinutes(first.startTime) - toMinutes(second.startTime)
    );
  }, [dayDataByName]);

  if (user?.role !== 'student') {
    return (
      <PagePlaceholder
        title="Schedule"
        description="Faculty schedule enhancements are covered in Phase 8."
      />
    );
  }

  const jumpToToday = () => {
    if (!WEEK_DAYS.includes(todayDay)) {
      return;
    }

    const targetNode = dayColumnRefs.current[todayDay];

    if (targetNode?.scrollIntoView) {
      targetNode.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  return (
    <VStack align="stretch" gap={6}>
      <Flex align={{ base: 'start', md: 'center' }} justify="space-between" direction={{ base: 'column', md: 'row' }} gap={3}>
        <Box>
          <Heading size="lg" color="scms.ink">
            Weekly Timetable
          </Heading>
          <Text mt={1} color="blackAlpha.700">
            Plan your classes for the week at a glance.
          </Text>
        </Box>

        <Button
          onClick={jumpToToday}
          bg="scms.navActive"
          color="white"
          _hover={{ opacity: 0.92 }}
          disabled={!WEEK_DAYS.includes(todayDay)}
        >
          <HStack gap={2}>
            <FiCalendar />
            <Text>Today</Text>
          </HStack>
        </Button>
      </Flex>

      {weekScheduleQuery.isPending ? (
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
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        </Box>
      ) : null}

      {weekScheduleQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load schedule</AlertTitle>
            <AlertDescription>
              {weekScheduleQuery.error?.response?.data?.message ||
                weekScheduleQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!weekScheduleQuery.isPending && !weekScheduleQuery.isError ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="blackAlpha.100"
          borderRadius="card"
          boxShadow="card"
          p={{ base: 4, md: 5 }}
        >
          <HStack mb={4} gap={3} color="blackAlpha.700" fontSize="sm">
            <Icon as={FiCalendar} boxSize={4} />
            <Text>
              Week: {formatDateLabel(weekScheduleQuery.data?.week?.startDate)} -{' '}
              {formatDateLabel(weekScheduleQuery.data?.week?.endDate)}
            </Text>
          </HStack>

          {timeSlots.length ? (
            <Box overflowX="auto">
              <Grid
                minW="980px"
                templateColumns={`140px repeat(${WEEK_DAYS.length}, minmax(165px, 1fr))`}
                gap={2}
              >
                <Box />
                {WEEK_DAYS.map((day) => {
                  const dayEntry = dayDataByName.get(day);
                  const isToday = day === todayDay;

                  return (
                    <Box
                      key={day}
                      ref={(node) => {
                        dayColumnRefs.current[day] = node;
                      }}
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor={isToday ? 'scms.navActive' : 'blackAlpha.100'}
                      bg={isToday ? 'blackAlpha.100' : 'blackAlpha.50'}
                      px={3}
                      py={3}
                    >
                      <Text fontWeight="semibold" color="scms.ink">
                        {day}
                      </Text>
                      <Text fontSize="xs" color="blackAlpha.700">
                        {formatDateLabel(dayEntry?.date)}
                      </Text>
                    </Box>
                  );
                })}

                {timeSlots.map((slot) => (
                  <Fragment key={slot.key}>
                    <Flex
                      align="center"
                      borderWidth="1px"
                      borderColor="blackAlpha.100"
                      borderRadius="xl"
                      px={3}
                      py={2}
                    >
                      <HStack gap={2} color="blackAlpha.700">
                        <Icon as={FiClock} boxSize={3.5} />
                        <Text fontSize="sm" fontWeight="medium">
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </HStack>
                    </Flex>

                    {WEEK_DAYS.map((day) => {
                      const dayClasses = (dayDataByName.get(day)?.classes || []).filter(
                        (classItem) =>
                          classItem.startTime === slot.startTime && classItem.endTime === slot.endTime
                      );

                      return (
                        <Box
                          key={`${day}-${slot.key}`}
                          minH="98px"
                          borderWidth="1px"
                          borderColor="blackAlpha.100"
                          borderRadius="xl"
                          px={2.5}
                          py={2.5}
                          bg="white"
                        >
                          {dayClasses.length ? (
                            <VStack align="stretch" gap={2}>
                              {dayClasses.map((classItem) => (
                                <Box
                                  key={`${classItem.course.id}-${classItem.startTime}-${classItem.day}`}
                                  bg={getClassColor(classItem.course.id)}
                                  borderWidth="1px"
                                  borderColor="blackAlpha.100"
                                  borderRadius="lg"
                                  px={2.5}
                                  py={2}
                                >
                                  <Text fontSize="sm" fontWeight="semibold" color="scms.ink">
                                    {classItem.course.courseName}
                                  </Text>
                                  <Text fontSize="xs" color="blackAlpha.700" mt={0.5}>
                                    {classItem.teacherName}
                                  </Text>
                                  <HStack gap={1.5} mt={1} color="blackAlpha.700">
                                    <Icon as={FiMapPin} boxSize={3.5} />
                                    <Text fontSize="xs">{classItem.location || 'Room TBA'}</Text>
                                  </HStack>
                                </Box>
                              ))}
                            </VStack>
                          ) : (
                            <Flex h="full" align="center" justify="center">
                              <Badge bg="blackAlpha.100" color="blackAlpha.700" borderRadius="full" px={2.5} py={1}>
                                Free
                              </Badge>
                            </Flex>
                          )}
                        </Box>
                      );
                    })}
                  </Fragment>
                ))}
              </Grid>
            </Box>
          ) : (
            <Text color="blackAlpha.700" fontSize="sm">
              No classes scheduled for this week.
            </Text>
          )}
        </Box>
      ) : null}
    </VStack>
  );
}

export default SchedulePage;
