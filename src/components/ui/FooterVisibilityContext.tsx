import { createContext, useContext } from "react";

interface FooterVisibilityContextValue {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export const FooterVisibilityContext =
  createContext<FooterVisibilityContextValue>({
    visible: true,
    setVisible: () => {},
  });

export const useFooterVisibility = () =>
  useContext(FooterVisibilityContext);

