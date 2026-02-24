import React from 'react';
import { Button, Text, Heading } from '@chakra-ui/react';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogCloseTrigger,
} from '../ui/dialog';
import useColors from '../../hooks/useColors';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Delete',
  colorScheme = 'red',
}) => {
  const { dark, cardBg, border, textPrimary, textSecondary, hoverBg } = useColors();

  return (
    <DialogRoot open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
      <DialogBackdrop />
      <DialogContent maxW="420px" bg={cardBg} color={textPrimary}>
        <DialogHeader borderBottomColor={border}>
          <Heading size="md" color={textPrimary}>{title}</Heading>
          <DialogCloseTrigger />
        </DialogHeader>
        <DialogBody>
          <Text color={textSecondary}>{message}</Text>
        </DialogBody>
        <DialogFooter borderTopColor={border}>
          <Button
            variant="outline"
            borderColor={border}
            color={textPrimary}
            _hover={{ bg: hoverBg }}
            onClick={onClose}
            mr={3}
          >
            Cancel
          </Button>
          <Button
            bg={dark ? '#3d1f1f' : 'red.500'}
            color={colorScheme === 'red' ? 'white' : undefined}
            colorScheme={colorScheme !== 'red' ? colorScheme : undefined}
            _hover={{ opacity: 0.85 }}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
};

export default ConfirmDialog;
