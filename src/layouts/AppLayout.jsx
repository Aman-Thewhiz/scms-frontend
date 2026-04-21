import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AvatarFallback,
  AvatarRoot,
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClipboard,
  FiFileText,
  FiGrid,
  FiHome,
  FiLayers,
  FiLogOut,
  FiMenu,
  FiMessageCircle,
  FiPieChart,
  FiSearch,
  FiSettings,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../lib/apiClient';

const PRIMARY_NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: FiHome, roles: ['student', 'faculty', 'admin'] },
  { label: 'Schedule', path: '/schedule', icon: FiCalendar, roles: ['student', 'faculty'] },
  { label: 'Tasks', path: '/tasks', icon: FiClipboard, roles: ['student'] },
  { label: 'Tests', path: '/tests', icon: FiFileText, roles: ['student'] },
  { label: 'Reports', path: '/reports', icon: FiPieChart, roles: ['student', 'faculty', 'admin'] },
  { label: 'Chat', path: '/chat', icon: FiMessageCircle, roles: ['student', 'faculty', 'admin'] },
  { label: 'Notes', path: '/notes', icon: FiBookOpen, roles: ['student', 'faculty'] },
  { label: 'Attendance', path: '/attendance', icon: FiLayers, roles: ['student', 'faculty'] },
  { label: 'Courses', path: '/courses', icon: FiBookOpen, roles: ['student', 'faculty', 'admin'] },
  { label: 'Students', path: '/students', icon: FiUsers, roles: ['faculty', 'admin'] },
  { label: 'Faculty', path: '/faculty', icon: FiUsers, roles: ['admin'] },
  { label: 'Departments', path: '/departments', icon: FiGrid, roles: ['admin'] },
  { label: 'Facilities', path: '/facilities', icon: FiGrid, roles: ['student', 'admin'] },
  { label: 'Notices', path: '/notices', icon: FiFileText, roles: ['student', 'faculty', 'admin'] },
  { label: 'Analytics', path: '/analytics', icon: FiPieChart, roles: ['admin'] },
];

const BOTTOM_NAV_ITEMS = [
  { label: 'Settings', path: '/settings', icon: FiSettings, roles: ['student', 'faculty', 'admin'] },
  { label: 'Profile', path: '/profile', icon: FiUser, roles: ['student', 'faculty', 'admin'] },
];

const ROLE_LABELS = {
  student: 'Student',
  faculty: 'Faculty',
  admin: 'Admin',
};

function isPathActive(pathname, targetPath) {
  return pathname === targetPath || pathname.startsWith(`${targetPath}/`);
}

function SidebarLink({ item, pathname, onNavigate }) {
  const active = isPathActive(pathname, item.path);

  return (
    <Box
      as={NavLink}
      to={item.path}
      display="flex"
      alignItems="center"
      gap={2.5}
      px={3.5}
      py={2.5}
      borderRadius="full"
      fontSize="sm"
      fontWeight="medium"
      transition="all 0.2s ease"
      bg={active ? 'scms.navActive' : 'transparent'}
      color={active ? 'white' : 'blackAlpha.800'}
      _hover={{
        textDecoration: 'none',
        bg: active ? 'scms.navActive' : 'blackAlpha.100',
      }}
      onClick={onNavigate}
    >
      <Icon as={item.icon} boxSize={4} />
      <Text>{item.label}</Text>
    </Box>
  );
}

function SidebarContent({ pathname, primaryItems, bottomItems, onNavigate }) {
  return (
    <Flex direction="column" h="full" gap={6}>
      <Box>
        <Text fontSize="xs" fontWeight="bold" letterSpacing="0.2em" color="blackAlpha.600">
          SCMS
        </Text>
        <Text fontSize="sm" color="blackAlpha.700" mt={1}>
          Campus Workspace
        </Text>
      </Box>

      <VStack align="stretch" gap={1}>
        {primaryItems.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </VStack>

      <Flex flex="1" />

      <VStack align="stretch" gap={1} pt={2} borderTopWidth="1px" borderColor="blackAlpha.100">
        {bottomItems.map((item) => (
          <SidebarLink
            key={item.path}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </VStack>
    </Flex>
  );
}

async function fetchNoticesCount() {
  const response = await apiClient.get('/notices', {
    params: {
      page: 1,
      limit: 1,
    },
  });

  return Number(response?.data?.data?.pagination?.total || 0);
}

function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const noticesCountQuery = useQuery({
    queryKey: ['layout', 'notices-total', user?.role],
    queryFn: fetchNoticesCount,
    enabled: Boolean(user?.role),
  });

  const primaryItems = useMemo(
    () => PRIMARY_NAV_ITEMS.filter((item) => item.roles.includes(user?.role || '')),
    [user?.role]
  );

  const bottomItems = useMemo(
    () => BOTTOM_NAV_ITEMS.filter((item) => item.roles.includes(user?.role || '')),
    [user?.role]
  );

  const closeMobileDrawer = () => {
    setIsMobileNavOpen(false);
  };

  const notificationCount = noticesCountQuery.data || 0;
  const firstName = user?.name?.trim()?.split(' ')[0] || 'User';

  return (
    <Flex
      h="100vh"
      overflow="hidden"
      bgGradient="linear(to-br, scms.pastelPink 0%, scms.white 48%, scms.pastelGreen 100%)"
    >
      <Box
        w="280px"
        h="full"
        px={4}
        py={5}
        borderRightWidth="1px"
        borderColor="blackAlpha.100"
        bg="rgba(255,255,255,0.86)"
        backdropFilter="blur(6px)"
        display={{ base: 'none', lg: 'block' }}
      >
        <SidebarContent pathname={location.pathname} primaryItems={primaryItems} bottomItems={bottomItems} />
      </Box>

      <Flex direction="column" flex="1" minW={0}>
        <Flex
          as="header"
          align={{ base: 'stretch', md: 'center' }}
          justify="space-between"
          px={{ base: 4, md: 6 }}
          py={{ base: 3, md: 4 }}
          gap={3}
          borderBottomWidth="1px"
          borderColor="blackAlpha.100"
          bg="rgba(255,255,255,0.86)"
          backdropFilter="blur(6px)"
          direction={{ base: 'column', md: 'row' }}
        >
          <HStack gap={3} align="center" minW={0}>
            <IconButton
              aria-label="Open navigation"
              variant="ghost"
              display={{ base: 'inline-flex', lg: 'none' }}
              onClick={() => setIsMobileNavOpen(true)}
            >
              <FiMenu />
            </IconButton>

            <Box position="relative" w={{ base: 'full', md: '340px' }} display={{ base: 'none', sm: 'block' }}>
              <Icon
                as={FiSearch}
                boxSize={4}
                color="blackAlpha.500"
                position="absolute"
                left={3}
                top="50%"
                transform="translateY(-50%)"
              />
              <Input
                pl={9}
                placeholder="Search courses, students, notices..."
                bg="white"
                borderColor="blackAlpha.200"
              />
            </Box>
          </HStack>

          <HStack gap={3} align="center" justify="space-between">
            <Box textAlign={{ base: 'left', md: 'right' }}>
              <Text fontSize="sm" color="blackAlpha.700">
                Welcome back, {firstName}
              </Text>
              <Badge
                mt={1}
                bg="blackAlpha.900"
                color="white"
                borderRadius="full"
                px={2.5}
                py={1}
                textTransform="none"
              >
                {ROLE_LABELS[user?.role] || 'Member'}
              </Badge>
            </Box>

            <Box position="relative">
              <IconButton aria-label="Notifications" variant="outline" bg="white" borderColor="blackAlpha.200">
                <FiBell />
              </IconButton>
              {notificationCount > 0 ? (
                <Flex
                  position="absolute"
                  top="-2"
                  right="-2"
                  minW="20px"
                  h="20px"
                  px={1}
                  align="center"
                  justify="center"
                  borderRadius="full"
                  bg="red.500"
                  color="white"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Flex>
              ) : null}
            </Box>

            <AvatarRoot size="sm" borderWidth="1px" borderColor="blackAlpha.200" bg="white">
              <AvatarFallback name={user?.name || 'User'} />
            </AvatarRoot>

            <Button
              onClick={logout}
              variant="outline"
              bg="white"
              borderColor="blackAlpha.200"
              display={{ base: 'none', xl: 'inline-flex' }}
            >
              <HStack gap={2}>
                <FiLogOut />
                <Text>Logout</Text>
              </HStack>
            </Button>
          </HStack>
        </Flex>

        <Box as="main" flex="1" overflowY="auto" px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }}>
          <Outlet />
        </Box>
      </Flex>

      {isMobileNavOpen ? (
        <Box
          position="fixed"
          inset={0}
          zIndex={40}
          bg="blackAlpha.700"
          onClick={closeMobileDrawer}
          display={{ base: 'block', lg: 'none' }}
        >
          <Box
            w="280px"
            h="full"
            p={5}
            bg="white"
            borderRightWidth="1px"
            borderColor="blackAlpha.100"
            onClick={(event) => event.stopPropagation()}
          >
            <Flex justify="space-between" align="center" mb={4}>
              <Text fontSize="sm" fontWeight="semibold" color="scms.ink">
                Navigation
              </Text>
              <IconButton aria-label="Close navigation" variant="ghost" onClick={closeMobileDrawer}>
                <FiX />
              </IconButton>
            </Flex>

            <SidebarContent
              pathname={location.pathname}
              primaryItems={primaryItems}
              bottomItems={bottomItems}
              onNavigate={closeMobileDrawer}
            />
          </Box>
        </Box>
      ) : null}
    </Flex>
  );
}

export default AppLayout;
