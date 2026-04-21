import { Button, Heading, Text, VStack } from "@chakra-ui/react";
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <VStack
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="card"
      boxShadow="card"
      p={{ base: 6, md: 8 }}
      align="start"
      gap={4}
    >
      <Heading size="lg">Page Not Found</Heading>
      <Text color="blackAlpha.700">
        The route you requested does not exist in the current SCMS frontend build.
      </Text>
      <Button as={Link} to="/dashboard" bg="scms.navActive" color="white" _hover={{ opacity: 0.9 }}>
        Go to Dashboard
      </Button>
    </VStack>
  );
}

export default NotFoundPage;
