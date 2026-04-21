import { Box, Heading, Text, VStack } from "@chakra-ui/react";

function PagePlaceholder({ title, description }) {
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="blackAlpha.100"
      borderRadius="card"
      boxShadow="card"
      p={{ base: 6, md: 8 }}
    >
      <VStack align="start" gap={3}>
        <Heading size="lg" color="scms.ink">
          {title}
        </Heading>
        <Text color="blackAlpha.700">{description}</Text>
      </VStack>
    </Box>
  );
}

export default PagePlaceholder;
