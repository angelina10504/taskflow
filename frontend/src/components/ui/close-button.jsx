import { IconButton as ChakraIconButton } from "@chakra-ui/react";
import { forwardRef } from "react";

export const CloseButton = forwardRef(function CloseButton(props, ref) {
  return (
    <ChakraIconButton variant="ghost" aria-label="Close" ref={ref} {...props}>
      {props.children ?? <span>✕</span>}
    </ChakraIconButton>
  );
});