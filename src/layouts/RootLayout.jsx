import { Box, Container, Flex, HStack, Link, Text } from "@chakra-ui/react";
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Schedule', path: '/schedule' },
  { label: 'Tasks', path: '/tasks' },
  { label: 'Tests', path: '/tests' },
  { label: 'Reports', path: '/reports' },
  { label: 'Chat', path: '/chat' },
  { label: 'Notes', path: '/notes' },
  { label: 'Attendance', path: '/attendance' },
  { label: 'Courses', path: '/courses' },
  { label: 'Students', path: '/students' },
  { label: 'Faculty', path: '/faculty' },
  { label: 'Departments', path: '/departments' },
  { label: 'Facilities', path: '/facilities' },
  { label: 'Notices', path: '/notices' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Settings', path: '/settings' },
  { label: 'Profile', path: '/profile' },
];

function RootLayout() {
  const location = useLocation();

  return (
    <Flex minH="100vh" direction="column">
      <Box
        as="header"
        position="sticky"
        top="0"
        zIndex="10"
        backdropFilter="blur(8px)"
        bg="rgba(255, 255, 255, 0.86)"
        borderBottomWidth="1px"
        borderColor="blackAlpha.100"
      >
        <Container maxW="7xl" py={4}>
          <Flex direction={{ base: 'column', md: 'row' }} gap={3} align={{ md: 'center' }} justify="space-between">
            <Text fontSize="xl" fontWeight="bold" color="scms.ink">
              Smart Campus Management System
            </Text>
            <HStack wrap="wrap" gap={2}>
              {navItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(`${item.path}/`);

                return (
                  <Link
                    key={item.path}
                    as={NavLink}
                    to={item.path}
                    px={3}
                    py={1.5}
                    borderRadius="full"
                    bg={isActive ? 'scms.navActive' : 'white'}
                    color={isActive ? 'white' : 'blackAlpha.800'}
                    borderWidth="1px"
                    borderColor={isActive ? 'scms.navActive' : 'blackAlpha.100'}
                    _hover={{ textDecoration: 'none', borderColor: 'scms.navActive' }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container as="main" maxW="7xl" py={{ base: 6, md: 8 }} flex="1">
        <Outlet />
      </Container>
    </Flex>
  );
}

export default RootLayout;
