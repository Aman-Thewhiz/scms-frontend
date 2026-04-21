import {
  Box,
  HStack,
  Toaster,
  ToastCloseTrigger,
  ToastDescription,
  ToastIndicator,
  ToastRoot,
  ToastTitle,
  VStack,
  createToaster,
} from '@chakra-ui/react';

export const toaster = createToaster({
  placement: 'bottom-end',
  overlap: false,
  pauseOnPageIdle: true,
});

function SCMSToaster() {
  return (
    <Toaster toaster={toaster}>
      {(toast) => (
        <ToastRoot maxW={{ base: 'calc(100vw - 2rem)', md: 'sm' }}>
          <HStack align="start" gap={3} w="full">
            <ToastIndicator mt={1} />
            <VStack align="start" gap={0.5} flex="1">
              {toast.title ? <ToastTitle>{toast.title}</ToastTitle> : null}
              {toast.description ? (
                <ToastDescription>{toast.description}</ToastDescription>
              ) : null}
            </VStack>
            <Box>
              <ToastCloseTrigger />
            </Box>
          </HStack>
        </ToastRoot>
      )}
    </Toaster>
  );
}

export default SCMSToaster;
