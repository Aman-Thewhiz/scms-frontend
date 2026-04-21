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
  Heading,
  HStack,
  Input,
  Skeleton,
  SimpleGrid,
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
import { useSearchParams } from 'react-router-dom';
import PagePlaceholder from '../components/PagePlaceholder';
import { toaster } from '../components/SCMSToaster';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const MANUAL_GRADES = ['A', 'B', 'C', 'D', 'F'];

function gradeFromMarks(marks) {
  if (marks >= 90) {
    return 'A';
  }

  if (marks >= 80) {
    return 'B';
  }

  if (marks >= 70) {
    return 'C';
  }

  if (marks >= 60) {
    return 'D';
  }

  return 'F';
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

async function fetchMyResults() {
  const response = await apiClient.get('/results/my-results');
  return response?.data?.data || { semesters: [], cumulative: null };
}

async function fetchMyGpa(studentId) {
  const response = await apiClient.get(`/results/gpa/${studentId}`);
  return response?.data?.data || { cumulative: null, bySemester: [] };
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

async function fetchCourseResults(courseId) {
  const response = await apiClient.get(`/results/course/${courseId}`);
  return response?.data?.data || { results: [] };
}

function StudentReportsView({ user }) {
  const resultsQuery = useQuery({
    queryKey: ['student-results', 'my-results'],
    queryFn: fetchMyResults,
    enabled: user?.role === 'student',
  });

  const gpaQuery = useQuery({
    queryKey: ['student-results', 'gpa', user?.id],
    queryFn: () => fetchMyGpa(user.id),
    enabled: user?.role === 'student' && Boolean(user?.id),
  });

  const cumulativeGpa = Number(
    gpaQuery.data?.cumulative?.gpa ?? resultsQuery.data?.cumulative?.gpa ?? 0
  ).toFixed(2);

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Results & Academic Report
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Semester-wise grades with your cumulative GPA.
        </Text>
      </Box>

      {gpaQuery.isPending ? (
        <Box
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
      ) : null}

      {gpaQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load GPA</AlertTitle>
            <AlertDescription>
              {gpaQuery.error?.response?.data?.message ||
                gpaQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!gpaQuery.isPending && !gpaQuery.isError ? (
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
                Cumulative GPA
              </Text>
              <Heading size="xl" mt={2} color="scms.ink">
                {cumulativeGpa}
              </Heading>
              <Text mt={1} fontSize="sm" color="blackAlpha.700">
                Based on {Number(gpaQuery.data?.cumulative?.gradedCourses || 0)} graded courses.
              </Text>
            </Box>
            <Badge bg="blackAlpha.900" color="white" borderRadius="full" px={2.5} py={1}>
              {Number(cumulativeGpa) >= 8.5 ? 'High' : Number(cumulativeGpa) >= 7 ? 'Medium' : 'Low'}
            </Badge>
          </Flex>
        </Box>
      ) : null}

      {resultsQuery.isPending ? (
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
          </VStack>
        </Box>
      ) : null}

      {resultsQuery.isError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load results</AlertTitle>
            <AlertDescription>
              {resultsQuery.error?.response?.data?.message ||
                resultsQuery.error?.message ||
                'Please refresh and try again.'}
            </AlertDescription>
          </AlertContent>
        </AlertRoot>
      ) : null}

      {!resultsQuery.isPending && !resultsQuery.isError ? (
        resultsQuery.data?.semesters?.length ? (
          <VStack align="stretch" gap={4}>
            {resultsQuery.data.semesters.map((semesterEntry) => (
              <Box
                key={semesterEntry.semester}
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
                  mb={4}
                >
                  <Box>
                    <Heading size="md" color="scms.ink">
                      Semester {semesterEntry.semester}
                    </Heading>
                    <Text fontSize="sm" color="blackAlpha.700" mt={1}>
                      GPA {Number(semesterEntry.gpa || 0).toFixed(2)} | Credits {semesterEntry.totalCredits}
                    </Text>
                  </Box>

                  <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                    {semesterEntry.gradedCourses} Courses
                  </Badge>
                </Flex>

                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Course Name</TableColumnHeader>
                        <TableColumnHeader textAlign="right">Marks</TableColumnHeader>
                        <TableColumnHeader textAlign="center">Grade</TableColumnHeader>
                        <TableColumnHeader textAlign="right">Credit Hours</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {semesterEntry.results.map((resultItem) => (
                        <TableRow key={resultItem.id}>
                          <TableCell>{resultItem.course.courseName}</TableCell>
                          <TableCell textAlign="right">{Number(resultItem.marks || 0).toFixed(1)}</TableCell>
                          <TableCell textAlign="center">
                            <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                              {resultItem.grade}
                            </Badge>
                          </TableCell>
                          <TableCell textAlign="right">{resultItem.course.credits}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              </Box>
            ))}
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
            <Text color="blackAlpha.700">No result records found yet.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function FacultyReportsView() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [marksInput, setMarksInput] = useState('');
  const [semesterInput, setSemesterInput] = useState('1');
  const [gradeMode, setGradeMode] = useState('auto');
  const [manualGrade, setManualGrade] = useState('A');

  const coursesQuery = useQuery({
    queryKey: ['faculty-grades', 'courses'],
    queryFn: fetchFacultyCourses,
  });

  const selectedCourseId = Number(searchParams.get('courseId')) || null;
  const selectedStudentId = Number(searchParams.get('studentId')) || null;

  useEffect(() => {
    if (!coursesQuery.isSuccess || selectedCourseId || !coursesQuery.data.length) {
      return;
    }

    setSearchParams({ courseId: String(coursesQuery.data[0].id) }, { replace: true });
  }, [coursesQuery.data, coursesQuery.isSuccess, selectedCourseId, setSearchParams]);

  const courseDetailsQuery = useQuery({
    queryKey: ['faculty-grades', 'course-detail', selectedCourseId],
    queryFn: () => fetchCourseDetails(selectedCourseId),
    enabled: Boolean(selectedCourseId),
  });

  const courseResultsQuery = useQuery({
    queryKey: ['faculty-grades', 'course-results', selectedCourseId],
    queryFn: () => fetchCourseResults(selectedCourseId),
    enabled: Boolean(selectedCourseId),
  });

  const studentOptions = courseDetailsQuery.data?.enrolledStudents || [];

  useEffect(() => {
    if (!studentOptions.length || selectedStudentId) {
      return;
    }

    const next = new URLSearchParams(searchParams);
    next.set('studentId', String(studentOptions[0].id));
    setSearchParams(next, { replace: true });
  }, [searchParams, selectedStudentId, setSearchParams, studentOptions]);

  const latestResultByStudentId = useMemo(
    () => pickLatestResultByStudent(courseResultsQuery.data?.results || []),
    [courseResultsQuery.data?.results]
  );

  const selectedStudentLatestResult = latestResultByStudentId.get(selectedStudentId) || null;

  const selectedStudentAllResults = useMemo(() => {
    return (courseResultsQuery.data?.results || []).filter(
      (result) => Number(result?.student?.id) === selectedStudentId
    );
  }, [courseResultsQuery.data?.results, selectedStudentId]);

  const semesterMatchedResult = selectedStudentAllResults.find(
    (result) => String(result.semester) === String(semesterInput)
  );

  useEffect(() => {
    if (!selectedStudentId) {
      return;
    }

    if (selectedStudentLatestResult) {
      setMarksInput(String(Number(selectedStudentLatestResult.marks || 0)));
      setSemesterInput(String(selectedStudentLatestResult.semester || '1'));
      setManualGrade(String(selectedStudentLatestResult.grade || 'A'));
      return;
    }

    setMarksInput('');
    setSemesterInput('1');
    setManualGrade('A');
  }, [selectedStudentId, selectedStudentLatestResult]);

  const upsertMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/results', payload),
    onSuccess: async () => {
      toaster.success({
        title: 'Result saved',
        description: 'Marks and grade were saved successfully.',
        duration: 3000,
      });

      await queryClient.invalidateQueries({ queryKey: ['faculty-grades', 'course-results', selectedCourseId] });
      await queryClient.invalidateQueries({ queryKey: ['faculty-roster'] });
    },
    onError: (error) => {
      toaster.error({
        title: 'Unable to save result',
        description:
          error?.response?.data?.message || error?.message || 'Please review form values and try again.',
        duration: 5000,
      });
    },
  });

  const effectiveGrade =
    gradeMode === 'auto'
      ? gradeFromMarks(Number(marksInput || 0))
      : manualGrade;

  const handleCourseChange = (courseId) => {
    const next = new URLSearchParams(searchParams);
    next.set('courseId', String(courseId));
    next.delete('studentId');
    setSearchParams(next);
  };

  const handleStudentChange = (studentId) => {
    const next = new URLSearchParams(searchParams);
    if (selectedCourseId) {
      next.set('courseId', String(selectedCourseId));
    }
    next.set('studentId', String(studentId));
    setSearchParams(next);
  };

  const submitResult = () => {
    if (!selectedCourseId || !selectedStudentId) {
      return;
    }

    const marksNumber = Number(marksInput);

    if (Number.isNaN(marksNumber) || marksInput === '') {
      toaster.error({
        title: 'Invalid marks',
        description: 'Please provide a valid numeric marks value.',
        duration: 5000,
      });
      return;
    }

    if (!semesterInput.trim()) {
      toaster.error({
        title: 'Invalid semester',
        description: 'Semester is required to save a result.',
        duration: 5000,
      });
      return;
    }

    upsertMutation.mutate({
      studentId: selectedStudentId,
      courseId: selectedCourseId,
      marks: marksNumber,
      grade: effectiveGrade,
      semester: semesterInput.trim(),
    });
  };

  const isPageLoading =
    coursesQuery.isPending ||
    (Boolean(selectedCourseId) && (courseDetailsQuery.isPending || courseResultsQuery.isPending));

  const pageError = coursesQuery.error || courseDetailsQuery.error || courseResultsQuery.error;

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Enter Grades
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Select a course and student, then create or update result entries.
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
                onClick={() => handleCourseChange(course.id)}
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
          </VStack>
        </Box>
      ) : null}

      {pageError ? (
        <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
          <AlertIndicator />
          <AlertContent>
            <AlertTitle>Unable to load grade-entry page</AlertTitle>
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
                Grade Form
              </Heading>

              {studentOptions.length ? (
                <VStack align="stretch" gap={4}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Select Student
                    </Text>
                    <HStack gap={2} flexWrap="wrap">
                      {studentOptions.map((student) => {
                        const active = Number(student.id) === selectedStudentId;

                        return (
                          <Button
                            key={student.id}
                            size="xs"
                            borderRadius="full"
                            borderWidth="1px"
                            borderColor={active ? 'scms.navActive' : 'blackAlpha.200'}
                            bg={active ? 'scms.navActive' : 'white'}
                            color={active ? 'white' : 'blackAlpha.800'}
                            _hover={{
                              bg: active ? 'scms.navActive' : 'blackAlpha.50',
                            }}
                            onClick={() => handleStudentChange(student.id)}
                          >
                            {student.name}
                          </Button>
                        );
                      })}
                    </HStack>
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Marks
                    </Text>
                    <Input
                      type="number"
                      value={marksInput}
                      onChange={(event) => setMarksInput(event.target.value)}
                      placeholder="Enter marks"
                    />
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Semester
                    </Text>
                    <Input
                      value={semesterInput}
                      onChange={(event) => setSemesterInput(event.target.value)}
                      placeholder="e.g. 1 or Spring-2026"
                    />
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Grade Selector
                    </Text>

                    <HStack gap={2} flexWrap="wrap">
                      <Button
                        size="xs"
                        borderRadius="full"
                        borderWidth="1px"
                        borderColor={gradeMode === 'auto' ? 'scms.navActive' : 'blackAlpha.200'}
                        bg={gradeMode === 'auto' ? 'scms.navActive' : 'white'}
                        color={gradeMode === 'auto' ? 'white' : 'blackAlpha.800'}
                        onClick={() => setGradeMode('auto')}
                      >
                        Auto ({effectiveGrade})
                      </Button>

                      {MANUAL_GRADES.map((grade) => {
                        const active = gradeMode === 'manual' && manualGrade === grade;

                        return (
                          <Button
                            key={grade}
                            size="xs"
                            borderRadius="full"
                            borderWidth="1px"
                            borderColor={active ? 'blackAlpha.900' : 'blackAlpha.200'}
                            bg={active ? 'blackAlpha.900' : 'white'}
                            color={active ? 'white' : 'blackAlpha.800'}
                            onClick={() => {
                              setGradeMode('manual');
                              setManualGrade(grade);
                            }}
                          >
                            {grade}
                          </Button>
                        );
                      })}
                    </HStack>
                  </Box>

                  <HStack justify="space-between" align="center">
                    <Text fontSize="sm" color="blackAlpha.700">
                      Final Grade: <Text as="span" fontWeight="bold" color="scms.ink">{effectiveGrade}</Text>
                    </Text>

                    <Button
                      bg="scms.navActive"
                      color="white"
                      _hover={{ opacity: 0.92 }}
                      onClick={submitResult}
                      disabled={upsertMutation.isPending}
                    >
                      {upsertMutation.isPending ? 'Saving...' : 'Save Result'}
                    </Button>
                  </HStack>
                </VStack>
              ) : (
                <Text color="blackAlpha.700">No enrolled students found for this course.</Text>
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
                Existing Result
              </Heading>

              {selectedStudentId ? (
                semesterMatchedResult ? (
                  <Box borderWidth="1px" borderColor="green.200" bg="green.50" borderRadius="xl" px={4} py={3} mb={4}>
                    <Text fontSize="sm" color="green.900" fontWeight="semibold">
                      Existing result found for this student-course-semester.
                    </Text>
                    <Text mt={1} fontSize="sm" color="green.800">
                      Grade {semesterMatchedResult.grade} | Marks {Number(semesterMatchedResult.marks || 0).toFixed(1)} | Updated {formatDateTime(semesterMatchedResult.updatedAt)}
                    </Text>
                  </Box>
                ) : selectedStudentLatestResult ? (
                  <Box borderWidth="1px" borderColor="blackAlpha.200" bg="blackAlpha.50" borderRadius="xl" px={4} py={3} mb={4}>
                    <Text fontSize="sm" color="blackAlpha.900" fontWeight="semibold">
                      Latest existing result for selected student
                    </Text>
                    <Text mt={1} fontSize="sm" color="blackAlpha.800">
                      Semester {selectedStudentLatestResult.semester} | Grade {selectedStudentLatestResult.grade} | Marks {Number(selectedStudentLatestResult.marks || 0).toFixed(1)}
                    </Text>
                  </Box>
                ) : (
                  <Box borderWidth="1px" borderColor="blackAlpha.100" bg="blackAlpha.50" borderRadius="xl" px={4} py={3} mb={4}>
                    <Text fontSize="sm" color="blackAlpha.700">No existing result was found for the selected student in this course.</Text>
                  </Box>
                )
              ) : null}

              {selectedStudentAllResults.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Semester</TableColumnHeader>
                        <TableColumnHeader textAlign="right">Marks</TableColumnHeader>
                        <TableColumnHeader textAlign="center">Grade</TableColumnHeader>
                        <TableColumnHeader>Last Updated</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedStudentAllResults.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>{result.semester}</TableCell>
                          <TableCell textAlign="right">{Number(result.marks || 0).toFixed(1)}</TableCell>
                          <TableCell textAlign="center">
                            <Badge bg="blackAlpha.100" color="blackAlpha.800" borderRadius="full" px={2.5} py={1}>
                              {result.grade}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(result.updatedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              ) : (
                <Text color="blackAlpha.700">No prior results available for the selected student.</Text>
              )}
            </Box>
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
            <Text color="blackAlpha.700">No assigned courses were found for your faculty profile.</Text>
          </Box>
        )
      ) : null}
    </VStack>
  );
}

function ReportsPage() {
  const { user } = useAuth();

  if (user?.role === 'student') {
    return <StudentReportsView user={user} />;
  }

  if (user?.role === 'faculty') {
    return <FacultyReportsView />;
  }

  return (
    <PagePlaceholder
      title="Reports"
      description="Admin analytics and report tools are delivered in the admin phase."
    />
  );
}

export default ReportsPage;
