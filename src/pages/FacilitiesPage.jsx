import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AccordionItem,
  AccordionItemBody,
  AccordionItemContent,
  AccordionItemIndicator,
  AccordionItemTrigger,
  AccordionRoot,
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
  TabsContent,
  TabsList,
  TabsRoot,
  TabsTrigger,
  Text,
  VStack,
} from '@chakra-ui/react';
import { FiEdit2, FiPlus, FiRotateCw, FiTrash2 } from 'react-icons/fi';
import { toaster } from '../components/SCMSToaster';
import PagePlaceholder from '../components/PagePlaceholder';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const EMPTY_HOSTEL_FORM = {
  studentId: '',
  roomNumber: '',
  checkInDate: '',
};

const EMPTY_LIBRARY_FORM = {
  studentId: '',
  bookTitle: '',
  borrowDate: '',
  dueDate: '',
};

const EMPTY_TRANSPORT_FORM = {
  routeName: '',
  departureTime: '',
  stopList: '',
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

function getLibraryStatusPill(status, isOverdue) {
  if (status === 'returned') {
    return {
      bg: 'green.100',
      color: 'green.800',
      label: 'Returned',
    };
  }

  if (isOverdue || status === 'overdue') {
    return {
      bg: 'red.100',
      color: 'red.800',
      label: 'Overdue',
    };
  }

  return {
    bg: 'orange.100',
    color: 'orange.800',
    label: 'Borrowed',
  };
}

async function fetchHostelAllocation() {
  const response = await apiClient.get('/facilities/hostel');
  return response?.data?.data || { allocation: null };
}

async function fetchLibraryHistory() {
  const response = await apiClient.get('/facilities/library', {
    params: {
      page: 1,
      limit: 50,
    },
  });

  return response?.data?.data || { items: [], pagination: null };
}

async function fetchTransportRoutes() {
  const response = await apiClient.get('/facilities/transport');
  return response?.data?.data || [];
}

async function fetchHostelAllocationsForAdmin() {
  const response = await apiClient.get('/facilities/hostel');
  return response?.data?.data?.items || [];
}

async function fetchLibraryBorrowsForAdmin(status = '') {
  const response = await apiClient.get('/facilities/library', {
    params: {
      page: 1,
      limit: 100,
      status: status || undefined,
    },
  });

  return response?.data?.data || { items: [], pagination: null };
}

async function fetchStudentsForFacilities() {
  const response = await apiClient.get('/students', {
    params: {
      page: 1,
      limit: 100,
    },
  });

  const items = response?.data?.data?.items || [];
  return items.filter((student) => student.isActive);
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

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function StudentFacilitiesView({ user }) {
  const hostelQuery = useQuery({
    queryKey: ['student-facilities', 'hostel'],
    queryFn: fetchHostelAllocation,
    enabled: user?.role === 'student',
  });

  const libraryQuery = useQuery({
    queryKey: ['student-facilities', 'library'],
    queryFn: fetchLibraryHistory,
    enabled: user?.role === 'student',
  });

  const transportQuery = useQuery({
    queryKey: ['student-facilities', 'transport'],
    queryFn: fetchTransportRoutes,
    enabled: user?.role === 'student',
  });

  const allocation = hostelQuery.data?.allocation || null;
  const libraryItems = libraryQuery.data?.items || [];
  const transportItems = transportQuery.data || [];

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Facilities
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Your hostel, library, and transport information in one place.
        </Text>
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
          Hostel
        </Heading>

        {hostelQuery.isPending ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        ) : null}

        {hostelQuery.isError ? (
          <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
            <AlertIndicator />
            <AlertContent>
              <AlertTitle>Unable to load hostel allocation</AlertTitle>
              <AlertDescription>
                {getErrorMessage(hostelQuery.error, 'Please refresh and try again.')}
              </AlertDescription>
            </AlertContent>
          </AlertRoot>
        ) : null}

        {!hostelQuery.isPending && !hostelQuery.isError ? (
          allocation ? (
            <HStack
              align="stretch"
              gap={3}
              wrap="wrap"
              borderWidth="1px"
              borderColor="blackAlpha.100"
              borderRadius="xl"
              p={3}
              bg="blackAlpha.50"
            >
              <Box>
                <Text fontSize="xs" color="blackAlpha.700">
                  Room Number
                </Text>
                <Text fontWeight="semibold" color="scms.ink">
                  {allocation.roomNumber}
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="blackAlpha.700">
                  Building
                </Text>
                <Text fontWeight="semibold" color="scms.ink">
                  {String(allocation.roomNumber || '').charAt(0) || 'N/A'} Block
                </Text>
              </Box>
              <Box>
                <Text fontSize="xs" color="blackAlpha.700">
                  Check-in Date
                </Text>
                <Text fontWeight="semibold" color="scms.ink">
                  {formatDateLabel(allocation.checkInDate)}
                </Text>
              </Box>
            </HStack>
          ) : (
            <Text color="blackAlpha.700">Not allocated.</Text>
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
      >
        <Heading size="md" color="scms.ink" mb={4}>
          Library Borrow History
        </Heading>

        {libraryQuery.isPending ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        ) : null}

        {libraryQuery.isError ? (
          <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
            <AlertIndicator />
            <AlertContent>
              <AlertTitle>Unable to load library history</AlertTitle>
              <AlertDescription>
                {getErrorMessage(libraryQuery.error, 'Please refresh and try again.')}
              </AlertDescription>
            </AlertContent>
          </AlertRoot>
        ) : null}

        {!libraryQuery.isPending && !libraryQuery.isError ? (
          libraryItems.length ? (
            <TableScrollArea>
              <TableRoot size="sm">
                <TableHeader>
                  <TableRow>
                    <TableColumnHeader>Book Title</TableColumnHeader>
                    <TableColumnHeader>Borrow Date</TableColumnHeader>
                    <TableColumnHeader>Due Date</TableColumnHeader>
                    <TableColumnHeader>Status</TableColumnHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {libraryItems.map((borrowItem) => {
                    const statusPill = getLibraryStatusPill(borrowItem.status, borrowItem.isOverdue);

                    return (
                      <TableRow key={borrowItem.id} bg={borrowItem.isOverdue ? 'red.50' : 'transparent'}>
                        <TableCell>{borrowItem.bookTitle}</TableCell>
                        <TableCell>{formatDateLabel(borrowItem.borrowDate)}</TableCell>
                        <TableCell>{formatDateLabel(borrowItem.dueDate)}</TableCell>
                        <TableCell>
                          <Badge bg={statusPill.bg} color={statusPill.color} borderRadius="full" px={2.5} py={1}>
                            {statusPill.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableRoot>
            </TableScrollArea>
          ) : (
            <Text color="blackAlpha.700">No library borrow records found.</Text>
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
      >
        <Heading size="md" color="scms.ink" mb={4}>
          Transport Routes
        </Heading>

        {transportQuery.isPending ? (
          <VStack align="stretch" gap={3}>
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
            <Skeleton height="18px" borderRadius="md" />
          </VStack>
        ) : null}

        {transportQuery.isError ? (
          <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
            <AlertIndicator />
            <AlertContent>
              <AlertTitle>Unable to load transport routes</AlertTitle>
              <AlertDescription>
                {getErrorMessage(transportQuery.error, 'Please refresh and try again.')}
              </AlertDescription>
            </AlertContent>
          </AlertRoot>
        ) : null}

        {!transportQuery.isPending && !transportQuery.isError ? (
          transportItems.length ? (
            <AccordionRoot multiple collapsible>
              {transportItems.map((routeItem) => (
                <AccordionItem key={routeItem.id} value={String(routeItem.id)}>
                  <AccordionItemTrigger>
                    <Flex flex="1" align="center" justify="space-between" py={2}>
                      <Box>
                        <Text fontWeight="medium" color="scms.ink">
                          {routeItem.routeName}
                        </Text>
                        <Text fontSize="xs" color="blackAlpha.700">
                          Departure {routeItem.departureTime}
                        </Text>
                      </Box>
                      <AccordionItemIndicator />
                    </Flex>
                  </AccordionItemTrigger>
                  <AccordionItemContent>
                    <AccordionItemBody>
                      <VStack align="stretch" gap={2}>
                        {(routeItem.stopList || []).map((stopName, stopIndex) => (
                          <HStack key={`${routeItem.id}-${stopName}-${stopIndex}`} gap={2}>
                            <Badge bg="blackAlpha.100" color="blackAlpha.700" borderRadius="full" px={2.5} py={1}>
                              Stop {stopIndex + 1}
                            </Badge>
                            <Text color="blackAlpha.700">{stopName}</Text>
                          </HStack>
                        ))}
                      </VStack>
                    </AccordionItemBody>
                  </AccordionItemContent>
                </AccordionItem>
              ))}
            </AccordionRoot>
          ) : (
            <Text color="blackAlpha.700">No transport routes available.</Text>
          )
        ) : null}
      </Box>
    </VStack>
  );
}

function AdminFacilitiesView() {
  const queryClient = useQueryClient();
  const [libraryStatusFilter, setLibraryStatusFilter] = useState('');

  const [hostelDialog, setHostelDialog] = useState({
    open: false,
    mode: 'add',
    allocation: null,
  });
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [transportDialog, setTransportDialog] = useState({
    open: false,
    mode: 'add',
    route: null,
  });

  const [hostelForm, setHostelForm] = useState({
    ...EMPTY_HOSTEL_FORM,
    checkInDate: getTodayDateString(),
  });
  const [libraryForm, setLibraryForm] = useState({
    ...EMPTY_LIBRARY_FORM,
    borrowDate: getTodayDateString(),
  });
  const [transportForm, setTransportForm] = useState(EMPTY_TRANSPORT_FORM);

  const [hostelFormErrors, setHostelFormErrors] = useState({});
  const [libraryFormErrors, setLibraryFormErrors] = useState({});
  const [transportFormErrors, setTransportFormErrors] = useState({});

  const studentsQuery = useQuery({
    queryKey: ['admin-facilities', 'students'],
    queryFn: fetchStudentsForFacilities,
  });

  const hostelQuery = useQuery({
    queryKey: ['admin-facilities', 'hostel'],
    queryFn: fetchHostelAllocationsForAdmin,
  });

  const libraryQuery = useQuery({
    queryKey: ['admin-facilities', 'library', libraryStatusFilter],
    queryFn: () => fetchLibraryBorrowsForAdmin(libraryStatusFilter),
  });

  const transportQuery = useQuery({
    queryKey: ['admin-facilities', 'transport'],
    queryFn: fetchTransportRoutes,
  });

  const createHostelMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/facilities/hostel', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Room allocated',
        description: 'Hostel allocation created successfully.',
        duration: 3000,
      });
      closeHostelDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'hostel'] });
    },
    onError: (error) => {
      setHostelFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to allocate room',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateHostelMutation = useMutation({
    mutationFn: ({ hostelId, payload }) => apiClient.put(`/facilities/hostel/${hostelId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Allocation updated',
        description: 'Hostel allocation updated successfully.',
        duration: 3000,
      });
      closeHostelDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'hostel'] });
    },
    onError: (error) => {
      setHostelFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update allocation',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deleteHostelMutation = useMutation({
    mutationFn: (allocation) => apiClient.delete(`/facilities/hostel/${allocation.id}`),
    onMutate: async (allocation) => {
      await queryClient.cancelQueries({ queryKey: ['admin-facilities', 'hostel'] });
      const previous = queryClient.getQueryData(['admin-facilities', 'hostel']);

      queryClient.setQueryData(['admin-facilities', 'hostel'], (oldValue) => {
        if (!Array.isArray(oldValue)) {
          return oldValue;
        }

        return oldValue.filter((item) => Number(item.id) !== Number(allocation.id));
      });

      return { previous };
    },
    onError: (error, _allocation, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-facilities', 'hostel'], context.previous);
      }

      toaster.error({
        title: 'Unable to remove allocation',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Allocation removed',
        description: 'Hostel allocation removed successfully.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'hostel'] });
    },
  });

  const createLibraryMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/facilities/library', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Borrow record added',
        description: 'Library borrow record created successfully.',
        duration: 3000,
      });
      closeLibraryDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'library'] });
    },
    onError: (error) => {
      setLibraryFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to add borrow record',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const returnLibraryMutation = useMutation({
    mutationFn: (borrowItem) =>
      apiClient.put(`/facilities/library/${borrowItem.id}`, {
        returnDate: getTodayDateString(),
      }),
    onMutate: async (borrowItem) => {
      const key = ['admin-facilities', 'library', libraryStatusFilter];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (oldValue) => {
        if (!oldValue?.items) {
          return oldValue;
        }

        return {
          ...oldValue,
          items: oldValue.items.map((item) =>
            Number(item.id) === Number(borrowItem.id)
              ? {
                  ...item,
                  status: 'returned',
                  returnDate: getTodayDateString(),
                  isOverdue: false,
                }
              : item
          ),
        };
      });

      return { previous, key };
    },
    onError: (error, _borrowItem, context) => {
      if (context?.previous && context?.key) {
        queryClient.setQueryData(context.key, context.previous);
      }

      toaster.error({
        title: 'Unable to mark return',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Book returned',
        description: 'Borrow record marked as returned.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'library'] });
    },
  });

  const createTransportMutation = useMutation({
    mutationFn: (payload) => apiClient.post('/facilities/transport', payload),
    onSuccess: () => {
      toaster.success({
        title: 'Route created',
        description: 'Transport route created successfully.',
        duration: 3000,
      });
      closeTransportDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'transport'] });
    },
    onError: (error) => {
      setTransportFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to create route',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const updateTransportMutation = useMutation({
    mutationFn: ({ routeId, payload }) => apiClient.put(`/facilities/transport/${routeId}`, payload),
    onSuccess: () => {
      toaster.success({
        title: 'Route updated',
        description: 'Transport route updated successfully.',
        duration: 3000,
      });
      closeTransportDialog();
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'transport'] });
    },
    onError: (error) => {
      setTransportFormErrors(getValidationErrors(error));
      toaster.error({
        title: 'Unable to update route',
        description: getErrorMessage(error, 'Please review the form and try again.'),
        duration: 5000,
      });
    },
  });

  const deleteTransportMutation = useMutation({
    mutationFn: (route) => apiClient.delete(`/facilities/transport/${route.id}`),
    onMutate: async (route) => {
      await queryClient.cancelQueries({ queryKey: ['admin-facilities', 'transport'] });
      const previous = queryClient.getQueryData(['admin-facilities', 'transport']);

      queryClient.setQueryData(['admin-facilities', 'transport'], (oldValue) => {
        if (!Array.isArray(oldValue)) {
          return oldValue;
        }

        return oldValue.filter((item) => Number(item.id) !== Number(route.id));
      });

      return { previous };
    },
    onError: (error, _route, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['admin-facilities', 'transport'], context.previous);
      }

      toaster.error({
        title: 'Unable to delete route',
        description: getErrorMessage(error, 'Please try again in a moment.'),
        duration: 5000,
      });
    },
    onSuccess: () => {
      toaster.success({
        title: 'Route deleted',
        description: 'Transport route deleted successfully.',
        duration: 3000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-facilities', 'transport'] });
    },
  });

  function openAddHostelDialog() {
    setHostelFormErrors({});
    setHostelForm({
      ...EMPTY_HOSTEL_FORM,
      checkInDate: getTodayDateString(),
    });
    setHostelDialog({
      open: true,
      mode: 'add',
      allocation: null,
    });
  }

  function openEditHostelDialog(allocation) {
    setHostelFormErrors({});
    setHostelForm({
      studentId: String(allocation.student.id),
      roomNumber: allocation.roomNumber || '',
      checkInDate: allocation.checkInDate || getTodayDateString(),
    });
    setHostelDialog({
      open: true,
      mode: 'edit',
      allocation,
    });
  }

  function closeHostelDialog() {
    setHostelFormErrors({});
    setHostelForm({
      ...EMPTY_HOSTEL_FORM,
      checkInDate: getTodayDateString(),
    });
    setHostelDialog({
      open: false,
      mode: 'add',
      allocation: null,
    });
  }

  function submitHostelForm(event) {
    event.preventDefault();
    setHostelFormErrors({});

    if (hostelDialog.mode === 'add') {
      createHostelMutation.mutate({
        studentId: Number(hostelForm.studentId),
        roomNumber: hostelForm.roomNumber.trim(),
        checkInDate: hostelForm.checkInDate,
      });
      return;
    }

    updateHostelMutation.mutate({
      hostelId: hostelDialog.allocation.id,
      payload: {
        roomNumber: hostelForm.roomNumber.trim(),
        checkInDate: hostelForm.checkInDate,
      },
    });
  }

  function openLibraryDialog() {
    setLibraryFormErrors({});
    setLibraryForm({
      ...EMPTY_LIBRARY_FORM,
      borrowDate: getTodayDateString(),
    });
    setLibraryDialogOpen(true);
  }

  function closeLibraryDialog() {
    setLibraryFormErrors({});
    setLibraryForm({
      ...EMPTY_LIBRARY_FORM,
      borrowDate: getTodayDateString(),
    });
    setLibraryDialogOpen(false);
  }

  function submitLibraryForm(event) {
    event.preventDefault();
    setLibraryFormErrors({});
    createLibraryMutation.mutate({
      studentId: Number(libraryForm.studentId),
      bookTitle: libraryForm.bookTitle.trim(),
      borrowDate: libraryForm.borrowDate,
      dueDate: libraryForm.dueDate,
    });
  }

  function openAddTransportDialog() {
    setTransportFormErrors({});
    setTransportForm(EMPTY_TRANSPORT_FORM);
    setTransportDialog({
      open: true,
      mode: 'add',
      route: null,
    });
  }

  function openEditTransportDialog(route) {
    setTransportFormErrors({});
    setTransportForm({
      routeName: route.routeName || '',
      departureTime: String(route.departureTime || '').slice(0, 5),
      stopList: (route.stopList || []).join(', '),
    });
    setTransportDialog({
      open: true,
      mode: 'edit',
      route,
    });
  }

  function closeTransportDialog() {
    setTransportFormErrors({});
    setTransportForm(EMPTY_TRANSPORT_FORM);
    setTransportDialog({
      open: false,
      mode: 'add',
      route: null,
    });
  }

  function submitTransportForm(event) {
    event.preventDefault();
    setTransportFormErrors({});

    const payload = {
      routeName: transportForm.routeName.trim(),
      departureTime: transportForm.departureTime,
      stopList: transportForm.stopList
        .split(',')
        .map((stop) => stop.trim())
        .filter(Boolean),
    };

    if (transportDialog.mode === 'add') {
      createTransportMutation.mutate(payload);
      return;
    }

    updateTransportMutation.mutate({
      routeId: transportDialog.route.id,
      payload,
    });
  }

  const hostelItems = hostelQuery.data || [];
  const libraryItems = libraryQuery.data?.items || [];
  const transportItems = transportQuery.data || [];
  const students = studentsQuery.data || [];

  const isHostelSubmitting = createHostelMutation.isPending || updateHostelMutation.isPending;
  const isLibrarySubmitting = createLibraryMutation.isPending;
  const isTransportSubmitting = createTransportMutation.isPending || updateTransportMutation.isPending;

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg" color="scms.ink">
          Facilities Management
        </Heading>
        <Text mt={1} color="blackAlpha.700">
          Manage hostel allocations, library borrows, and transport routes.
        </Text>
      </Box>

      <TabsRoot defaultValue="hostel" fitted>
        <TabsList bg="blackAlpha.50" borderRadius="full" p={1}>
          <TabsTrigger value="hostel" borderRadius="full">
            Hostel
          </TabsTrigger>
          <TabsTrigger value="library" borderRadius="full">
            Library
          </TabsTrigger>
          <TabsTrigger value="transport" borderRadius="full">
            Transport
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hostel" mt={4}>
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 4, md: 5 }}
          >
            <Flex justify="space-between" align="center" mb={4} gap={2}>
              <Heading size="md" color="scms.ink">
                Hostel Allocations
              </Heading>
              <Button size="sm" bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddHostelDialog}>
                <HStack gap={1.5}>
                  <FiPlus />
                  <Text>Allocate Room</Text>
                </HStack>
              </Button>
            </Flex>

            {hostelQuery.isPending ? (
              <VStack align="stretch" gap={3}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} height="16px" borderRadius="md" />
                ))}
              </VStack>
            ) : null}

            {hostelQuery.isError ? (
              <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
                <AlertIndicator />
                <AlertContent>
                  <AlertTitle>Unable to load allocations</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(hostelQuery.error, 'Please refresh and try again.')}
                  </AlertDescription>
                </AlertContent>
              </AlertRoot>
            ) : null}

            {!hostelQuery.isPending && !hostelQuery.isError ? (
              hostelItems.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Student</TableColumnHeader>
                        <TableColumnHeader>Department</TableColumnHeader>
                        <TableColumnHeader>Room</TableColumnHeader>
                        <TableColumnHeader>Check-In</TableColumnHeader>
                        <TableColumnHeader>Actions</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hostelItems.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell>
                            <VStack align="start" gap={0}>
                              <Text fontWeight="medium" color="scms.ink">
                                {allocation.student.name}
                              </Text>
                              <Text fontSize="xs" color="blackAlpha.600">
                                {allocation.student.rollNumber}
                              </Text>
                            </VStack>
                          </TableCell>
                          <TableCell>{allocation.student.departmentName}</TableCell>
                          <TableCell>{allocation.roomNumber}</TableCell>
                          <TableCell>{formatDateLabel(allocation.checkInDate)}</TableCell>
                          <TableCell>
                            <HStack gap={1.5}>
                              <IconButton
                                aria-label="Edit allocation"
                                size="xs"
                                variant="outline"
                                onClick={() => openEditHostelDialog(allocation)}
                              >
                                <Icon as={FiEdit2} />
                              </IconButton>
                              <IconButton
                                aria-label="Delete allocation"
                                size="xs"
                                variant="outline"
                                colorPalette="red"
                                disabled={deleteHostelMutation.isPending}
                                onClick={() => deleteHostelMutation.mutate(allocation)}
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
              ) : (
                <Text color="blackAlpha.700">No hostel allocations found.</Text>
              )
            ) : null}
          </Box>
        </TabsContent>

        <TabsContent value="library" mt={4}>
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 4, md: 5 }}
          >
            <Flex
              justify="space-between"
              align={{ base: 'start', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              mb={4}
              gap={2}
            >
              <Heading size="md" color="scms.ink">
                Library Borrow Records
              </Heading>

              <HStack gap={2}>
                <NativeSelectRoot size="sm" minW="170px">
                  <NativeSelectField
                    value={libraryStatusFilter}
                    onChange={(event) => setLibraryStatusFilter(event.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="borrowed">Borrowed</option>
                    <option value="overdue">Overdue</option>
                    <option value="returned">Returned</option>
                  </NativeSelectField>
                  <NativeSelectIndicator />
                </NativeSelectRoot>

                <Button size="sm" bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openLibraryDialog}>
                  <HStack gap={1.5}>
                    <FiPlus />
                    <Text>Add Borrow</Text>
                  </HStack>
                </Button>
              </HStack>
            </Flex>

            {libraryQuery.isPending ? (
              <VStack align="stretch" gap={3}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} height="16px" borderRadius="md" />
                ))}
              </VStack>
            ) : null}

            {libraryQuery.isError ? (
              <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
                <AlertIndicator />
                <AlertContent>
                  <AlertTitle>Unable to load borrow records</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(libraryQuery.error, 'Please refresh and try again.')}
                  </AlertDescription>
                </AlertContent>
              </AlertRoot>
            ) : null}

            {!libraryQuery.isPending && !libraryQuery.isError ? (
              libraryItems.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Book</TableColumnHeader>
                        <TableColumnHeader>Student</TableColumnHeader>
                        <TableColumnHeader>Borrow Date</TableColumnHeader>
                        <TableColumnHeader>Due Date</TableColumnHeader>
                        <TableColumnHeader>Status</TableColumnHeader>
                        <TableColumnHeader>Actions</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {libraryItems.map((borrowItem) => {
                        const statusPill = getLibraryStatusPill(borrowItem.status, borrowItem.isOverdue);
                        const canReturn = borrowItem.status !== 'returned';

                        return (
                          <TableRow key={borrowItem.id} bg={borrowItem.isOverdue ? 'red.50' : 'transparent'}>
                            <TableCell>{borrowItem.bookTitle}</TableCell>
                            <TableCell>
                              <VStack align="start" gap={0}>
                                <Text fontWeight="medium" color="scms.ink">
                                  {borrowItem.student.name}
                                </Text>
                                <Text fontSize="xs" color="blackAlpha.600">
                                  {borrowItem.student.rollNumber}
                                </Text>
                              </VStack>
                            </TableCell>
                            <TableCell>{formatDateLabel(borrowItem.borrowDate)}</TableCell>
                            <TableCell>{formatDateLabel(borrowItem.dueDate)}</TableCell>
                            <TableCell>
                              <Badge bg={statusPill.bg} color={statusPill.color} borderRadius="full" px={2.5} py={1}>
                                {statusPill.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={!canReturn || returnLibraryMutation.isPending}
                                onClick={() => returnLibraryMutation.mutate(borrowItem)}
                              >
                                <HStack gap={1.5}>
                                  <FiRotateCw />
                                  <Text>Mark Return</Text>
                                </HStack>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </TableRoot>
                </TableScrollArea>
              ) : (
                <Text color="blackAlpha.700">No borrow records found.</Text>
              )
            ) : null}
          </Box>
        </TabsContent>

        <TabsContent value="transport" mt={4}>
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="blackAlpha.100"
            borderRadius="card"
            boxShadow="card"
            p={{ base: 4, md: 5 }}
          >
            <Flex justify="space-between" align="center" mb={4} gap={2}>
              <Heading size="md" color="scms.ink">
                Transport Routes
              </Heading>
              <Button size="sm" bg="scms.navActive" color="white" _hover={{ opacity: 0.92 }} onClick={openAddTransportDialog}>
                <HStack gap={1.5}>
                  <FiPlus />
                  <Text>Add Route</Text>
                </HStack>
              </Button>
            </Flex>

            {transportQuery.isPending ? (
              <VStack align="stretch" gap={3}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} height="16px" borderRadius="md" />
                ))}
              </VStack>
            ) : null}

            {transportQuery.isError ? (
              <AlertRoot status="error" borderRadius="xl" borderWidth="1px">
                <AlertIndicator />
                <AlertContent>
                  <AlertTitle>Unable to load transport routes</AlertTitle>
                  <AlertDescription>
                    {getErrorMessage(transportQuery.error, 'Please refresh and try again.')}
                  </AlertDescription>
                </AlertContent>
              </AlertRoot>
            ) : null}

            {!transportQuery.isPending && !transportQuery.isError ? (
              transportItems.length ? (
                <TableScrollArea>
                  <TableRoot size="sm">
                    <TableHeader>
                      <TableRow>
                        <TableColumnHeader>Route</TableColumnHeader>
                        <TableColumnHeader>Departure</TableColumnHeader>
                        <TableColumnHeader>Stops</TableColumnHeader>
                        <TableColumnHeader>Actions</TableColumnHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transportItems.map((route) => (
                        <TableRow key={route.id}>
                          <TableCell>
                            <Text fontWeight="medium" color="scms.ink">
                              {route.routeName}
                            </Text>
                          </TableCell>
                          <TableCell>{String(route.departureTime || '').slice(0, 5)}</TableCell>
                          <TableCell>{(route.stopList || []).length}</TableCell>
                          <TableCell>
                            <HStack gap={1.5}>
                              <IconButton
                                aria-label="Edit route"
                                size="xs"
                                variant="outline"
                                onClick={() => openEditTransportDialog(route)}
                              >
                                <Icon as={FiEdit2} />
                              </IconButton>
                              <IconButton
                                aria-label="Delete route"
                                size="xs"
                                variant="outline"
                                colorPalette="red"
                                disabled={deleteTransportMutation.isPending}
                                onClick={() => deleteTransportMutation.mutate(route)}
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
              ) : (
                <Text color="blackAlpha.700">No transport routes found.</Text>
              )
            ) : null}
          </Box>
        </TabsContent>
      </TabsRoot>

      <DialogRoot
        open={hostelDialog.open}
        onOpenChange={(details) => {
          if (!details.open) {
            closeHostelDialog();
          }
        }}
      >
        <Portal>
          <DialogBackdrop bg="blackAlpha.400" />
          <DialogPositioner px={3}>
            <DialogContent maxW="lg">
              <DialogHeader>
                <DialogTitle>
                  {hostelDialog.mode === 'add' ? 'Allocate Hostel Room' : 'Edit Hostel Allocation'}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="hostel-form" onSubmit={submitHostelForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Student
                    </Text>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={hostelForm.studentId}
                        onChange={(event) =>
                          setHostelForm((previous) => ({ ...previous, studentId: event.target.value }))
                        }
                        disabled={hostelDialog.mode === 'edit'}
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.rollNumber} | {student.name}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    {hostelFormErrors.studentId ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {hostelFormErrors.studentId}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Room Number
                    </Text>
                    <Input
                      value={hostelForm.roomNumber}
                      onChange={(event) =>
                        setHostelForm((previous) => ({ ...previous, roomNumber: event.target.value }))
                      }
                      placeholder="e.g. A-203"
                      required
                    />
                    {hostelFormErrors.roomNumber ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {hostelFormErrors.roomNumber}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Check-In Date
                    </Text>
                    <Input
                      type="date"
                      value={hostelForm.checkInDate}
                      onChange={(event) =>
                        setHostelForm((previous) => ({ ...previous, checkInDate: event.target.value }))
                      }
                      required
                    />
                    {hostelFormErrors.checkInDate ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {hostelFormErrors.checkInDate}
                      </Text>
                    ) : null}
                  </Box>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <HStack gap={2}>
                  <Button variant="outline" onClick={closeHostelDialog} disabled={isHostelSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="hostel-form"
                    bg="scms.navActive"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                    disabled={isHostelSubmitting}
                  >
                    {isHostelSubmitting
                      ? 'Saving...'
                      : hostelDialog.mode === 'add'
                        ? 'Allocate Room'
                        : 'Save Changes'}
                  </Button>
                </HStack>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>

      <DialogRoot
        open={libraryDialogOpen}
        onOpenChange={(details) => {
          if (!details.open) {
            closeLibraryDialog();
          }
        }}
      >
        <Portal>
          <DialogBackdrop bg="blackAlpha.400" />
          <DialogPositioner px={3}>
            <DialogContent maxW="lg">
              <DialogHeader>
                <DialogTitle>Add Library Borrow Record</DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="library-form" onSubmit={submitLibraryForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Student
                    </Text>
                    <NativeSelectRoot>
                      <NativeSelectField
                        value={libraryForm.studentId}
                        onChange={(event) =>
                          setLibraryForm((previous) => ({ ...previous, studentId: event.target.value }))
                        }
                        required
                      >
                        <option value="">Select student</option>
                        {students.map((student) => (
                          <option key={student.id} value={student.id}>
                            {student.rollNumber} | {student.name}
                          </option>
                        ))}
                      </NativeSelectField>
                      <NativeSelectIndicator />
                    </NativeSelectRoot>
                    {libraryFormErrors.studentId ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {libraryFormErrors.studentId}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Book Title
                    </Text>
                    <Input
                      value={libraryForm.bookTitle}
                      onChange={(event) =>
                        setLibraryForm((previous) => ({ ...previous, bookTitle: event.target.value }))
                      }
                      placeholder="Enter book title"
                      required
                    />
                    {libraryFormErrors.bookTitle ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {libraryFormErrors.bookTitle}
                      </Text>
                    ) : null}
                  </Box>

                  <HStack align="start" gap={3}>
                    <Box flex="1">
                      <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                        Borrow Date
                      </Text>
                      <Input
                        type="date"
                        value={libraryForm.borrowDate}
                        onChange={(event) =>
                          setLibraryForm((previous) => ({ ...previous, borrowDate: event.target.value }))
                        }
                        required
                      />
                      {libraryFormErrors.borrowDate ? (
                        <Text mt={1} fontSize="xs" color="red.600">
                          {libraryFormErrors.borrowDate}
                        </Text>
                      ) : null}
                    </Box>

                    <Box flex="1">
                      <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                        Due Date
                      </Text>
                      <Input
                        type="date"
                        value={libraryForm.dueDate}
                        onChange={(event) =>
                          setLibraryForm((previous) => ({ ...previous, dueDate: event.target.value }))
                        }
                        required
                      />
                      {libraryFormErrors.dueDate ? (
                        <Text mt={1} fontSize="xs" color="red.600">
                          {libraryFormErrors.dueDate}
                        </Text>
                      ) : null}
                    </Box>
                  </HStack>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <HStack gap={2}>
                  <Button variant="outline" onClick={closeLibraryDialog} disabled={isLibrarySubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="library-form"
                    bg="scms.navActive"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                    disabled={isLibrarySubmitting}
                  >
                    {isLibrarySubmitting ? 'Saving...' : 'Add Borrow Record'}
                  </Button>
                </HStack>
              </DialogFooter>
            </DialogContent>
          </DialogPositioner>
        </Portal>
      </DialogRoot>

      <DialogRoot
        open={transportDialog.open}
        onOpenChange={(details) => {
          if (!details.open) {
            closeTransportDialog();
          }
        }}
      >
        <Portal>
          <DialogBackdrop bg="blackAlpha.400" />
          <DialogPositioner px={3}>
            <DialogContent maxW="lg">
              <DialogHeader>
                <DialogTitle>
                  {transportDialog.mode === 'add' ? 'Add Transport Route' : 'Edit Transport Route'}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <VStack as="form" id="transport-form" onSubmit={submitTransportForm} align="stretch" gap={3}>
                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Route Name
                    </Text>
                    <Input
                      value={transportForm.routeName}
                      onChange={(event) =>
                        setTransportForm((previous) => ({ ...previous, routeName: event.target.value }))
                      }
                      placeholder="e.g. North Loop"
                      required
                    />
                    {transportFormErrors.routeName ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {transportFormErrors.routeName}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Departure Time
                    </Text>
                    <Input
                      type="time"
                      value={transportForm.departureTime}
                      onChange={(event) =>
                        setTransportForm((previous) => ({ ...previous, departureTime: event.target.value }))
                      }
                      required
                    />
                    {transportFormErrors.departureTime ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {transportFormErrors.departureTime}
                      </Text>
                    ) : null}
                  </Box>

                  <Box>
                    <Text mb={1.5} fontSize="sm" fontWeight="medium" color="scms.ink">
                      Stops (comma separated)
                    </Text>
                    <Input
                      value={transportForm.stopList}
                      onChange={(event) =>
                        setTransportForm((previous) => ({ ...previous, stopList: event.target.value }))
                      }
                      placeholder="Gate 1, Main Square, Library Circle"
                      required
                    />
                    {transportFormErrors.stopList ? (
                      <Text mt={1} fontSize="xs" color="red.600">
                        {transportFormErrors.stopList}
                      </Text>
                    ) : null}
                  </Box>
                </VStack>
              </DialogBody>
              <DialogFooter>
                <HStack gap={2}>
                  <Button variant="outline" onClick={closeTransportDialog} disabled={isTransportSubmitting}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    form="transport-form"
                    bg="scms.navActive"
                    color="white"
                    _hover={{ opacity: 0.92 }}
                    disabled={isTransportSubmitting}
                  >
                    {isTransportSubmitting
                      ? 'Saving...'
                      : transportDialog.mode === 'add'
                        ? 'Create Route'
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

function FacilitiesPage() {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <AdminFacilitiesView />;
  }

  if (user?.role === 'student') {
    return <StudentFacilitiesView user={user} />;
  }

  return (
    <PagePlaceholder
      title="Facilities"
      description="Facilities are available for student and admin roles."
    />
  );
}

export default FacilitiesPage;
